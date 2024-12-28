import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateScheduleForWeek } from "@/utils/schedulingEngine";
import { publishSchedule } from "@/utils/scheduleUtils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
      toast.success("Schedule generated successfully");
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
      toast.success("Schedule published successfully");
    } catch (error: any) {
      toast.error("Failed to publish schedule: " + error.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleGenerateSchedule}>
          Generate Schedule for Selected Week
        </Button>
        {scheduleData?.status === 'draft' && (
          <Button onClick={handlePublishSchedule} variant="secondary">
            Publish Schedule
          </Button>
        )}
      </CardContent>
    </Card>
  );
}