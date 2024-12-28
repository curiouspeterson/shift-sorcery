import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateScheduleForWeek, publishSchedule } from "@/utils/schedulingEngine";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek } from "date-fns";

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4">
          <Button onClick={handleGenerateSchedule}>
            Generate Schedule for Selected Week
          </Button>
          {scheduleData?.status === 'draft' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This schedule is in draft mode. Review the assignments and publish when ready.
              </p>
              <Button onClick={handlePublishSchedule} variant="secondary">
                Publish Schedule
              </Button>
            </div>
          )}
          {scheduleData?.status === 'published' && (
            <p className="text-sm text-green-600">
              This schedule has been published and employees have been notified.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}