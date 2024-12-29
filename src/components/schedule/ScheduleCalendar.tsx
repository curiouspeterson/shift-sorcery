import { format, startOfWeek, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DailySchedule } from "./DailySchedule";

interface ScheduleCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date | undefined) => void;
  scheduleData: any;
}

export function ScheduleCalendar({
  selectedDate,
  scheduleData,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((day) => {
            const formattedDate = format(day, "yyyy-MM-dd");
            
            return (
              <DailySchedule
                key={day.toISOString()}
                day={day}
                scheduleData={scheduleData}
                coverageRequirements={coverageRequirements || []}
                formattedDate={formattedDate}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}