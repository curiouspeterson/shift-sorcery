import { format, startOfWeek, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DailySchedule } from "./DailySchedule";
import { WeekNavigation } from "./calendar/WeekNavigation";
import { DailyCoverageStats } from "./calendar/DailyCoverageStats";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ScheduleCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date | undefined) => void;
  scheduleData: any;
  isLoading?: boolean;
}

export function ScheduleCalendar({
  selectedDate,
  scheduleData,
  isLoading = false
}: ScheduleCalendarProps) {
  const weekStart = startOfWeek(selectedDate);

  const { data: coverageRequirements, isLoading: coverageLoading } = useQuery({
    queryKey: ['coverage-requirements'],
    queryFn: async () => {
      console.log('Fetching coverage requirements...');
      const { data, error } = await supabase
        .from('coverage_requirements')
        .select('*')
        .order('start_time');
      
      if (error) {
        console.error('Error fetching coverage requirements:', error);
        throw error;
      }
      console.log('Coverage requirements:', data);
      return data;
    }
  });

  const { data: availabilityStats } = useQuery({
    queryKey: ['availability-stats', weekStart],
    queryFn: async () => {
      console.log('Fetching availability stats...');
      const { data, error } = await supabase
        .from('employee_availability')
        .select('day_of_week, employee_id')
        .order('day_of_week');

      if (error) {
        console.error('Error fetching availability stats:', error);
        throw error;
      }

      // Group by day and count unique employees
      const stats = data.reduce((acc: any, curr) => {
        if (!acc[curr.day_of_week]) {
          acc[curr.day_of_week] = new Set();
        }
        acc[curr.day_of_week].add(curr.employee_id);
        return acc;
      }, {});

      // Convert to array format
      const formattedStats = Object.entries(stats).map(([day, employees]: [string, any]) => ({
        day: parseInt(day),
        availableEmployees: employees.size
      }));

      console.log('Availability stats:', formattedStats);
      return formattedStats;
    }
  });

  if (isLoading || coverageLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <WeekNavigation weekStart={weekStart} />
          <div className="space-y-6">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-8 w-1/4" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  {Array.from({ length: 4 }, (_, j) => (
                    <Skeleton key={j} className="h-10" />
                  ))}
                </div>
                <Skeleton className="h-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check for potential coverage issues
  const hasCoverageIssues = availabilityStats?.some(stat => {
    const maxRequired = Math.max(...(coverageRequirements || []).map(req => req.min_employees));
    return stat.availableEmployees < maxRequired;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Schedule</CardTitle>
        {hasCoverageIssues && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Some days may have insufficient employee availability to meet coverage requirements.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        <WeekNavigation weekStart={weekStart} />
        
        <div className="space-y-6">
          {Array.from({ length: 7 }, (_, i) => {
            const day = addDays(weekStart, i);
            const formattedDate = format(day, "yyyy-MM-dd");
            const dayStats = availabilityStats?.find(stat => stat.day === day.getDay());
            
            return (
              <div key={day.toISOString()} className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    {format(day, "EEEE, MMM d")}
                  </h3>
                  {dayStats && (
                    <span className="text-sm text-muted-foreground">
                      {dayStats.availableEmployees} employees available
                    </span>
                  )}
                </div>
                <DailySchedule
                  day={day}
                  scheduleData={scheduleData}
                  coverageRequirements={coverageRequirements || []}
                  formattedDate={formattedDate}
                />
                <DailyCoverageStats
                  coverageRequirements={coverageRequirements || []}
                  assignments={scheduleData?.schedule_assignments || []}
                  date={formattedDate}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}