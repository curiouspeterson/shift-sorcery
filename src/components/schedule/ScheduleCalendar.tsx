import { format, startOfWeek, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DailySchedule } from "./DailySchedule";
import { WeekNavigation } from "./calendar/WeekNavigation";
import { DailyCoverageStats } from "./calendar/DailyCoverageStats";
import { Skeleton } from "@/components/ui/skeleton";

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

  const { data: coverageRequirements } = useQuery({
    queryKey: ['coverage-requirements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coverage_requirements')
        .select('*')
        .order('start_time');
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <WeekNavigation weekStart={weekStart} />
        
        <div className="space-y-6">
          {Array.from({ length: 7 }, (_, i) => {
            const day = addDays(weekStart, i);
            const formattedDate = format(day, "yyyy-MM-dd");
            
            return (
              <div key={day.toISOString()} className="space-y-4">
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