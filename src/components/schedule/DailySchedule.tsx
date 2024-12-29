import { format } from "date-fns";
import { ShiftLabel } from "./ShiftLabel";
import { ShiftAssignment } from "./ShiftAssignment";
import { getShiftType } from "./ShiftUtils";

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

  const sortAssignmentsByShiftType = (assignments: any[]) => {
    const shiftOrder = {
      "Day Shift Early": 1,
      "Day Shift": 2,
      "Swing Shift": 3,
      "Graveyard": 4
    };

    return [...assignments].sort((a, b) => {
      const aType = getShiftType(a.shift.start_time);
      const bType = getShiftType(b.shift.start_time);
      
      // First sort by shift type
      const typeComparison = (shiftOrder[aType as keyof typeof shiftOrder] || 0) - 
                            (shiftOrder[bType as keyof typeof shiftOrder] || 0);
      
      if (typeComparison !== 0) return typeComparison;
      
      // If same shift type, sort by start time
      const getMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      return getMinutes(a.shift.start_time) - getMinutes(b.shift.start_time);
    });
  };

  const dayAssignments = getShiftAssignments(scheduleData?.schedule_assignments, formattedDate);
  const sortedAssignments = sortAssignmentsByShiftType(dayAssignments);

  return (
    <div className="border-b pb-4 last:border-0">
      <h3 className="font-medium mb-2">{format(day, "EEEE, MMM d")}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        {shiftTypes.map(shiftType => (
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
          />
        ))}
      </div>
      <div className="space-y-2">
        {sortedAssignments.map((assignment: any) => (
          <ShiftAssignment
            key={assignment.id}
            assignment={assignment}
          />
        ))}
        {(!scheduleData?.schedule_assignments ||
          !dayAssignments.length) && (
          <p className="text-sm text-muted-foreground">
            No shifts scheduled
          </p>
        )}
      </div>
    </div>
  );
}