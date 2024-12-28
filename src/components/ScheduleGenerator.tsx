import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { ScheduleCalendar } from "./schedule/ScheduleCalendar";
import { ScheduleControls } from "./schedule/ScheduleControls";

export function ScheduleGenerator() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch user ID on component mount
  useState(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUserId();
  }, []);

  const { data: scheduleData, refetch } = useQuery({
    queryKey: ["schedule", format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const weekStart = startOfWeek(selectedDate);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const { data: schedule } = await supabase
        .from("schedules")
        .select(`
          *,
          schedule_assignments(
            *,
            employee:profiles(*),
            shift:shifts(*)
          )
        `)
        .eq("week_start_date", format(weekStart, "yyyy-MM-dd"))
        .maybeSingle();

      return schedule;
    }
  });

  if (!userId) return null;

  return (
    <div className="space-y-6">
      <ScheduleControls
        selectedDate={selectedDate}
        userId={userId}
        onScheduleGenerated={refetch}
      />
      <ScheduleCalendar
        selectedDate={selectedDate}
        onDateSelect={(date) => date && setSelectedDate(date)}
        scheduleData={scheduleData}
      />
    </div>
  );
}