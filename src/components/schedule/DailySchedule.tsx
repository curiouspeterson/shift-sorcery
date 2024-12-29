import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShiftAssignmentManager } from "./ShiftAssignmentManager";
import { CoverageRequirementTracker } from "./CoverageRequirementTracker";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('start_time');
      
      if (error) throw error;
      return data;
    }
  });

  const dayAssignments = scheduleData?.schedule_assignments?.filter(
    (assignment: any) => assignment.date === formattedDate
  ) || [];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{format(day, "EEEE, MMMM d")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-medium mb-4">Shift Assignments</h3>
              {shifts?.map(shift => (
                <ShiftAssignmentManager
                  key={shift.id}
                  shift={shift}
                  date={formattedDate}
                  scheduleId={scheduleData?.id}
                  assignments={dayAssignments}
                />
              ))}
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Coverage Requirements</h3>
              {coverageRequirements.map(requirement => (
                <CoverageRequirementTracker
                  key={requirement.id}
                  requirement={requirement}
                  assignments={dayAssignments}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}