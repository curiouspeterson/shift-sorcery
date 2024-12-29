import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { generateScheduleForWeek, publishSchedule } from "@/utils/schedulingEngine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScheduleStatus } from "./controls/ScheduleStatus";
import { ScheduleActions } from "./controls/ScheduleActions";
import { DraftNotice } from "./controls/DraftNotice";
import { Skeleton } from "@/components/ui/skeleton";

interface ScheduleControlsProps {
  selectedDate: Date;
  userId: string;
  onScheduleGenerated: () => void;
  scheduleData?: any;
  isLoading?: boolean;
}

export function ScheduleControls({
  selectedDate,
  userId,
  onScheduleGenerated,
  scheduleData,
  isLoading = false
}: ScheduleControlsProps) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateSchedule = async () => {
    console.log('🎯 Generate schedule clicked', {
      selectedDate: format(selectedDate, 'yyyy-MM-dd'),
      userId
    });

    try {
      setIsGenerating(true);
      console.log('🔄 Starting schedule generation');
      await generateScheduleForWeek(selectedDate, userId);
      
      console.log('🔄 Invalidating queries');
      await queryClient.invalidateQueries({ 
        queryKey: ["schedule", format(selectedDate, "yyyy-MM-dd")] 
      });
      
      console.log('🔄 Triggering refetch');
      onScheduleGenerated();
      
      toast.success("Schedule generated successfully", {
        description: `Draft schedule created for week of ${format(selectedDate, "MMM d, yyyy")}`
      });
    } catch (error: any) {
      console.error('❌ Schedule generation failed:', error);
      toast.error("Failed to generate schedule: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishSchedule = async () => {
    if (!scheduleData?.id) {
      console.warn('⚠️ Attempted to publish without schedule data');
      toast.error("No schedule to publish");
      return;
    }

    console.log('📢 Publishing schedule:', scheduleData.id);

    try {
      await publishSchedule(scheduleData.id);
      console.log('🔄 Invalidating queries after publish');
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      toast.success("Schedule published successfully", {
        description: "All employees will be notified of their shifts."
      });
    } catch (error: any) {
      console.error('❌ Schedule publication failed:', error);
      toast.error("Failed to publish schedule: " + error.message);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!scheduleData?.id) {
      console.warn('⚠️ Attempted to delete without schedule data');
      toast.error("No schedule to delete");
      return;
    }

    console.log('🗑️ Deleting schedule:', scheduleData.id);

    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleData.id);

      if (error) {
        console.error('❌ Delete error:', error);
        throw error;
      }

      console.log('🔄 Invalidating queries after delete');
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      toast.success("Schedule deleted successfully");
    } catch (error: any) {
      console.error('❌ Schedule deletion failed:', error);
      toast.error("Failed to delete schedule: " + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ScheduleStatus 
          status={scheduleData?.status} 
          onDelete={handleDeleteSchedule} 
        />
        <ScheduleActions 
          status={scheduleData?.status}
          onGenerate={handleGenerateSchedule}
          onPublish={handlePublishSchedule}
          isGenerating={isGenerating}
        />
      </div>

      {scheduleData?.status === 'draft' && <DraftNotice />}
    </div>
  );
}