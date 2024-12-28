import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek } from "date-fns";

export async function generateScheduleForWeek(selectedDate: Date, userId: string) {
  try {
    // First, check if a schedule already exists for this week
    const weekStartDate = format(startOfWeek(selectedDate), 'yyyy-MM-dd');
    const { data: existingSchedule } = await supabase
      .from('schedules')
      .select()
      .eq('week_start_date', weekStartDate)
      .maybeSingle();

    if (existingSchedule) {
      throw new Error('A schedule already exists for this week');
    }

    const { error } = await supabase.functions.invoke('generate-schedule', {
      body: { 
        weekStartDate,
        userId 
      }
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error generating schedule:', error);
    throw error;
  }
}

export async function publishSchedule(scheduleId: string) {
  const { error } = await supabase
    .from('schedules')
    .update({ status: 'published' })
    .eq('id', scheduleId);
  
  if (error) throw error;
}