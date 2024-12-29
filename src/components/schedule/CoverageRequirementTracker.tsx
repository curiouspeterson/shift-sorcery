import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { getShiftType } from "@/utils/shiftUtils";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { AssignEmployeeDialog } from "./AssignEmployeeDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CoverageRequirementTrackerProps {
  requirement: any;
  assignments: any[];
  date: string;
  scheduleId?: string;
}

export function CoverageRequirementTracker({
  requirement,
  assignments,
  date,
  scheduleId
}: CoverageRequirementTrackerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const shiftType = getShiftType(requirement.start_time);
  const assignedCount = assignments.filter(
    a => getShiftType(a.shift.start_time) === shiftType
  ).length;
  
  const { data: matchingShift } = useQuery({
    queryKey: ['shift-by-time', requirement.start_time, requirement.end_time],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('start_time', requirement.start_time)
        .eq('end_time', requirement.end_time)
        .maybeSingle();

      if (error) {
        console.error('Error fetching matching shift:', error);
        return null;
      }

      return data;
    }
  });
  
  const coveragePercentage = Math.min(
    (assignedCount / requirement.min_employees) * 100,
    100
  );

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Coverage for {format(new Date(`2000-01-01T${requirement.start_time}`), 'h:mm a')} - 
            {format(new Date(`2000-01-01T${requirement.end_time}`), 'h:mm a')}
          </CardTitle>
          {matchingShift && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Employee
            </Button>
          )}
        </div>
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

      {matchingShift && (
        <AssignEmployeeDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          shiftId={matchingShift.id}
          date={date}
          scheduleId={scheduleId}
          shiftType={shiftType}
        />
      )}
    </Card>
  );
}