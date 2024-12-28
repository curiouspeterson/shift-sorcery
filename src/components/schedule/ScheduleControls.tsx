import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateSchedule } from "@/utils/schedulingEngine";
import { publishSchedule } from "@/utils/scheduleUtils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ScheduleControlsProps {
  selectedDate: Date;
  userId: string;
  onScheduleGenerated: () => void;
}

export function ScheduleControls({
  selectedDate,
  userId,
  onScheduleGenerated,
}: ScheduleControlsProps) {
  const queryClient = useQueryClient();

  const handleGenerateSchedule = async () => {
    try {
      await generateSchedule(selectedDate, userId);
      toast.success("Schedule generated successfully");
      onScheduleGenerated();
    } catch (error: any) {
      toast.error("Failed to generate schedule: " + error.message);
    }
  };

  const handlePublishSchedule = async (scheduleId: string) => {
    try {
      await publishSchedule(scheduleId);
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
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
      </CardContent>
    </Card>
  );
}