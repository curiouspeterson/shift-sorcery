import { ShiftAssignment } from "./ShiftAssignment";

interface AssignmentsListProps {
  assignments: any[];
  scheduleData: any;
}

export function AssignmentsList({ assignments, scheduleData }: AssignmentsListProps) {
  return (
    <div className="space-y-2">
      {assignments.map((assignment: any) => (
        <ShiftAssignment
          key={assignment.id}
          assignment={assignment}
        />
      ))}
      {(!scheduleData?.schedule_assignments ||
        !assignments.length) && (
        <p className="text-sm text-muted-foreground">
          No shifts scheduled
        </p>
      )}
    </div>
  );
}