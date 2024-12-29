import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface WeeklyHoursData {
  [key: string]: number;
}

export function useWeeklyHours(date: string) {
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHoursData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeeklyHours = async () => {
      setLoading(true);
      setError(null);

      try {
        const weekStart = format(startOfWeek(new Date(date)), 'yyyy-MM-dd');
        const weekEnd = format(endOfWeek(new Date(date)), 'yyyy-MM-dd');

        const { data: assignments, error: weeklyError } = await supabase
          .from('schedule_assignments')
          .select(`
            employee_id,
            shift:shifts(duration_hours)
          `)
          .gte('date', weekStart)
          .lte('date', weekEnd);

        if (weeklyError) throw weeklyError;

        // Calculate weekly hours for each employee
        const hours: WeeklyHoursData = {};
        assignments?.forEach(assignment => {
          const duration = assignment.shift?.duration_hours || 0;
          hours[assignment.employee_id] = 
            (hours[assignment.employee_id] || 0) + Number(duration);
        });

        setWeeklyHours(hours);
      } catch (error: any) {
        console.error('Error fetching weekly hours:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyHours();
  }, [date]);

  return { weeklyHours, loading, error };
}