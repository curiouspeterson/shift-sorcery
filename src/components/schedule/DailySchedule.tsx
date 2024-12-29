import { format } from "date-fns";
import { ShiftLabel } from "./ShiftLabel";
import { AssignmentsList } from "./AssignmentsList";
import { getShiftType } from "./ShiftUtils";
import { sortAssignmentsByShiftType } from "@/utils/assignmentSorting";

interface DailyScheduleProps {
  day: Date;
  scheduleData: any;
  coverageRequirements: any[];
  formattedDate: string;
}

export function DailySchedule({ 
  day, 
  scheduleData, 
  coverageRequirements,
  formattedDate 
}: DailyScheduleProps) {
  const shiftTypes = ["Day Shift Early", "Day Shift", "Swing Shift", "Graveyard"];

  const getShiftAssignments = (assignments: any[], date: string) => {
    return assignments?.filter(
      (assignment: any) => assignment.date === date
    ) || [];
  };

  const dayAssignments = getShiftAssignments(scheduleData?.schedule_assignments, formattedDate);
  const sortedAssignments = sortAssignmentsByShiftType(dayAssignments);

  // Get the first shift ID for each shift type
  const shiftIds = new Map<string, string>();
  dayAssignments.forEach((assignment: any) => {
    const type = getShiftType(assignment.shift.start_time);
    if (!shiftIds.has(type)) {
      shiftIds.set(type, assignment.shift.id);
    }
  });

  return (
    <div className="border-b pb-4 last:border-0">
      <h3 className="font-medium mb-2">{format(day, "EEEE, MMM d")}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        {shiftTypes.map(shiftType => {
          const shiftId = shiftIds.get(shiftType);
          return (
            <ShiftLabel
              key={shiftType}
              shiftType={shiftType}
              currentStaff={dayAssignments.filter(
                (assignment: any) => getShiftType(assignment.shift.start_time) === shiftType
              ).length}
              minStaff={coverageRequirements?.reduce((max, req) => {
                if (getShiftType(req.start_time) === shiftType) {
                  return Math.max(max, req.min_employees);
                }
                return max;
              }, 0) || 0}
              date={formattedDate}
              scheduleId={scheduleData?.id}
              shiftId={shiftId || ''}
            />
          );
        })}
      </div>
      <AssignmentsList 
        assignments={sortedAssignments}
        scheduleData={scheduleData}
      />
    </div>
  );
}