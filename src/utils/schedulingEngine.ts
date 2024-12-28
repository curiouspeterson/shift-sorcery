import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek } from "date-fns";

export async function generateScheduleForWeek(selectedDate: Date, userId: string) {
  try {
    const { error } = await supabase.functions.invoke('generate-schedule', {
      body: { 
        weekStartDate: format(startOfWeek(selectedDate), 'yyyy-MM-dd'),
        userId 
      }
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error generating schedule:', error);
    throw error;
  }
}