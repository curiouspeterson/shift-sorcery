import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ShiftAssignmentProps {
  assignment: any;
}

export function ShiftAssignment({ assignment }: ShiftAssignmentProps) {
  return (
    <div className="flex items-center justify-between bg-muted p-2 rounded-lg">
      <div>
        <span className="font-medium">
          {assignment.employee.first_name} {assignment.employee.last_name}
        </span>
        <Badge variant="outline" className="ml-2">
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