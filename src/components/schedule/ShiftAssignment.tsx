import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getShiftType } from "@/utils/shiftUtils";

interface ShiftAssignmentProps {
  assignment: {
    employee: {
      first_name: string;
      last_name: string;
    };
    shift: {
      name: string;
      start_time: string;
      end_time: string;
    };
  };
}

export function ShiftAssignment({ assignment }: ShiftAssignmentProps) {
  const formatTime = (timeStr: string) => {
    try {
      return format(new Date(`2000-01-01T${timeStr}`), 'h:mm a');
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeStr;
    }
  };

  const shiftType = getShiftType(assignment.shift.start_time);
  const getShiftColor = () => {
    switch (shiftType) {
      case "Day Shift Early":
        return "bg-green-100 text-green-800 border-green-200";
      case "Day Shift":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Swing Shift":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Graveyard":
        return "bg-pink-100 text-pink-800 border-pink-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getShiftColor()}>
            {shiftType}
          </Badge>
          <span className="font-medium">
            {assignment.employee.first_name} {assignment.employee.last_name}
          </span>
        </div>
        <div className="flex flex-col items-end text-sm">
          <span className="font-medium text-muted-foreground">
            {assignment.shift.name}
          </span>
          <span className="text-muted-foreground">
            {formatTime(assignment.shift.start_time)} - {formatTime(assignment.shift.end_time)}
          </span>
        </div>
      </div>
    </Card>
  );
}