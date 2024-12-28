import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateScheduleForWeek, publishSchedule } from "@/utils/schedulingEngine";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ScheduleControlsProps {
  selectedDate: Date;
  userId: string;
  onScheduleGenerated: () => void;
  scheduleData?: any;
}

export function ScheduleControls({
  selectedDate,
  userId,
  onScheduleGenerated,
  scheduleData,
}: ScheduleControlsProps) {
  const queryClient = useQueryClient();

  const handleGenerateSchedule = async () => {
    try {
      await generateScheduleForWeek(selectedDate, userId);
      toast.success("Schedule generated successfully", {
        description: `Draft schedule created for week of ${format(startOfWeek(selectedDate), "MMM d, yyyy")}`
      });
      onScheduleGenerated();
    } catch (error: any) {
      toast.error("Failed to generate schedule: " + error.message);
    }
  };

  const handlePublishSchedule = async () => {
    if (!scheduleData?.id) {
      toast.error("No schedule to publish");
      return;
    }

    try {
      await publishSchedule(scheduleData.id);
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      toast.success("Schedule published successfully", {
        description: "All employees will be notified of their shifts."
      });
    } catch (error: any) {
      toast.error("Failed to publish schedule: " + error.message);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!scheduleData?.id) {
      toast.error("No schedule to delete");
      return;
    }

    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleData.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      toast.success("Schedule deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete schedule: " + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Schedule Status</h3>
          {scheduleData ? (
            <Badge variant={scheduleData.status === 'draft' ? 'secondary' : 'success'}>
              {scheduleData.status === 'draft' ? 'Draft' : 'Published'}
            </Badge>
          ) : (
            <Badge variant="outline">No Schedule</Badge>
          )}
        </div>
        <div className="space-x-2">
          {!scheduleData && (
            <Button onClick={handleGenerateSchedule}>
              Generate Schedule
            </Button>
          )}
          {scheduleData?.status === 'draft' && (
            <>
              <Button onClick={handlePublishSchedule} variant="secondary">
                Publish Schedule
              </Button>
              <Button onClick={handleDeleteSchedule} variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {scheduleData?.status === 'draft' && (
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            This schedule is in draft mode. Review the assignments below and publish when ready.
          </p>
        </div>
      )}
    </div>
  );
}