import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek } from "date-fns";
import { toast } from "sonner";

export async function generateScheduleForWeek(selectedDate: Date, userId: string) {
  console.log('🚀 Starting schedule generation process', {
    weekStartDate: format(startOfWeek(selectedDate), 'yyyy-MM-dd'),
    userId
  });

  try {
    const weekStartDate = format(startOfWeek(selectedDate), 'yyyy-MM-dd');
    
    // Check for existing schedule
    console.log('🔍 Checking for existing schedule for week:', weekStartDate);
    const { data: existingSchedules, error: checkError } = await supabase
      .from('schedules')
      .select()
      .eq('week_start_date', weekStartDate);

    if (checkError) {
      console.error('❌ Error checking existing schedule:', checkError);
      throw checkError;
    }

    if (existingSchedules && existingSchedules.length > 0) {
      console.warn('⚠️ Schedule already exists for week:', weekStartDate);
      throw new Error('A schedule already exists for this week');
    }

    console.log('✅ No existing schedule found, proceeding with generation');

    console.log('📞 Calling generate-schedule edge function with params:', {
      weekStartDate,
      userId
    });

    const { data, error } = await supabase.functions.invoke('generate-schedule', {
      body: { 
        weekStartDate,
        userId 
      }
    });

    if (error) {
      console.error('❌ Edge function error:', error);
      throw error;
    }

    // Show coverage status in toast
    if (data.coverage) {
      Object.entries(data.coverage).forEach(([shiftType, status]: [string, any]) => {
        const coveragePercent = (status.assigned / status.required) * 100;
        if (coveragePercent < 100) {
          toast.warning(`${shiftType}: ${status.assigned}/${status.required} staff (${coveragePercent.toFixed(1)}%)`);
        }
      });
    }

    if (data.messages && data.messages.length > 0) {
      data.messages.forEach((message: string) => {
        if (message.includes('not fully met')) {
          toast.warning(message);
        } else {
          toast.info(message);
        }
      });
    }

    console.log('✅ Schedule generation completed successfully', data);
    return data;
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