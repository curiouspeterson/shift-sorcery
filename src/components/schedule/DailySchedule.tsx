import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShiftAssignmentManager } from "./ShiftAssignmentManager";
import { CoverageRequirementTracker } from "./CoverageRequirementTracker";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { data: shifts, isLoading } = useQuery({
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

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Skeleton className="h-4 w-32 mb-4" />
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">
          {format(day, "EEEE, MMMM d")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="text-base md:text-lg font-medium">Coverage Requirements</h3>
              <div className="space-y-3">
                {coverageRequirements.map(requirement => (
                  <CoverageRequirementTracker
                    key={requirement.id}
                    requirement={requirement}
                    assignments={dayAssignments}
                    date={formattedDate}
                    scheduleId={scheduleData?.id}
                  />
                ))}
                {!coverageRequirements.length && (
                  <p className="text-sm text-muted-foreground">
                    No coverage requirements defined
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-base md:text-lg font-medium">Shift Assignments</h3>
              <div className="space-y-3">
                {shifts?.map(shift => (
                  <ShiftAssignmentManager
                    key={shift.id}
                    shift={shift}
                    date={formattedDate}
                    scheduleId={scheduleData?.id}
                    assignments={dayAssignments}
                  />
                ))}
                {!shifts?.length && (
                  <p className="text-sm text-muted-foreground">
                    No shifts configured for this day
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}