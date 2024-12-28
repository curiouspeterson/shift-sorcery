import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek } from "date-fns";

export async function generateScheduleForWeek(selectedDate: Date, userId: string) {
  console.log('🚀 Starting schedule generation process', {
    weekStartDate: format(startOfWeek(selectedDate), 'yyyy-MM-dd'),
    userId
  });

  try {
    const weekStartDate = format(startOfWeek(selectedDate), 'yyyy-MM-dd');
    
    // Check for existing schedule
    const { data: existingSchedule, error: checkError } = await supabase
      .from('schedules')
      .select()
      .eq('week_start_date', weekStartDate)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking existing schedule:', checkError);
      throw checkError;
    }

    if (existingSchedule) {
      console.warn('⚠️ Schedule already exists for week:', weekStartDate);
      throw new Error('A schedule already exists for this week');
    }

    console.log('✅ No existing schedule found, proceeding with generation');

    const { error } = await supabase.functions.invoke('generate-schedule', {
      body: { 
        weekStartDate,
        userId 
      }
    });

    if (error) {
      console.error('❌ Edge function error:', error);
      throw error;
    }

    console.log('✅ Schedule generation completed successfully');
  } catch (error) {
    console.error('❌ Error generating schedule:', error);
    throw error;
  }
}

export async function publishSchedule(scheduleId: string) {
  console.log('🚀 Publishing schedule:', scheduleId);

  try {
    const { error } = await supabase
      .from('schedules')
      .update({ status: 'published' })
      .eq('id', scheduleId);
    
    if (error) {
      console.error('❌ Error publishing schedule:', error);
      throw error;
    }

    console.log('✅ Schedule published successfully');
  } catch (error) {
    console.error('❌ Error in publishSchedule:', error);
    throw error;
  }
}