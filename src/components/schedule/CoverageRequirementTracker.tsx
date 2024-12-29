import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { getShiftType } from "@/utils/shiftUtils";

interface CoverageRequirementTrackerProps {
  requirement: any;
  assignments: any[];
}

export function CoverageRequirementTracker({
  requirement,
  assignments
}: CoverageRequirementTrackerProps) {
  const shiftType = getShiftType(requirement.start_time);
  const assignedCount = assignments.filter(
    a => getShiftType(a.shift.start_time) === shiftType
  ).length;
  
  const coveragePercentage = Math.min(
    (assignedCount / requirement.min_employees) * 100,
    100
  );

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">
          Coverage for {format(new Date(`2000-01-01T${requirement.start_time}`), 'h:mm a')} - 
          {format(new Date(`2000-01-01T${requirement.end_time}`), 'h:mm a')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Progress value={coveragePercentage} />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {assignedCount} / {requirement.min_employees} employees
            </span>
            <span className={coveragePercentage === 100 ? "text-green-600" : "text-amber-600"}>
              {coveragePercentage.toFixed(0)}% coverage
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}