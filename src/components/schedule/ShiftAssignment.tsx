import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getShiftType } from "./ShiftUtils";

interface ShiftAssignmentProps {
  assignment: any;
}

const getShiftColor = (shiftType: string) => {
  switch (shiftType) {
    case "Day Shift Early":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Day Shift":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Swing Shift":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Graveyard":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function ShiftAssignment({ assignment }: ShiftAssignmentProps) {
  const shiftType = getShiftType(assignment.shift.start_time);
  const colorClasses = getShiftColor(shiftType);

  return (
    <div className="flex items-center justify-between bg-muted p-2 rounded-lg">
      <div>
        <span className="font-medium">
          {assignment.employee.first_name} {assignment.employee.last_name}
        </span>
        <Badge variant="outline" className={`ml-2 ${colorClasses}`}>
          {assignment.shift.name}
        </Badge>
      </div>
      <span className="text-sm text-muted-foreground">
        {format(new Date(`2000-01-01T${assignment.shift.start_time}`), "h:mm a")}{" "}
        -{" "}
        {format(new Date(`2000-01-01T${assignment.shift.end_time}`), "h:mm a")}
      </span>
    </div>
  );
}