import { format } from "date-fns";
import { CoverageRequirement } from "@/types";
import { getShiftType } from "@/utils/shiftUtils";

interface DailyCoverageStatsProps {
  coverageRequirements: CoverageRequirement[];
  assignments: any[];
  date: string;
}

export function DailyCoverageStats({ 
  coverageRequirements, 
  assignments,
  date 
}: DailyCoverageStatsProps) {
  const dailyAssignments = assignments?.filter(
    (assignment: any) => assignment.date === date
  ) || [];

  const getCoverageStatus = (requirement: CoverageRequirement) => {
    const shiftType = getShiftType(requirement.start_time);
    const assigned = dailyAssignments.filter(
      (a: any) => getShiftType(a.shift.start_time) === shiftType
    ).length;
    
    return {
      required: requirement.min_employees,
      assigned,
      isMet: assigned >= requirement.min_employees
    };
  };

  return (
    <div className="space-y-2">
      {coverageRequirements.map(req => {
        const status = getCoverageStatus(req);
        return (
          <div 
            key={req.id}
            className="flex justify-between text-sm"
          >
            <span className="text-muted-foreground">
              {format(new Date(`2000-01-01T${req.start_time}`), 'h:mm a')} - 
              {format(new Date(`2000-01-01T${req.end_time}`), 'h:mm a')}
            </span>
            <span className={status.isMet ? "text-green-600" : "text-red-600"}>
              {status.assigned}/{status.required}
            </span>
          </div>
        );
      })}
    </div>
  );
}