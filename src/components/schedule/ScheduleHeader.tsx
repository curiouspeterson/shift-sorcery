import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CardTitle } from "@/components/ui/card";

interface ScheduleHeaderProps {
  selectedDate: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

export function ScheduleHeader({ 
  selectedDate, 
  onPreviousWeek, 
  onNextWeek 
}: ScheduleHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <CardTitle>Schedule Management</CardTitle>
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onPreviousWeek}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous Week
        </Button>
        <span className="font-medium">
          Week of {format(startOfWeek(selectedDate), "MMM d, yyyy")}
        </span>
        <Button variant="outline" onClick={onNextWeek}>
          Next Week
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}