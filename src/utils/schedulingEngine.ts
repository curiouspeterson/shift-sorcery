import { supabase } from "@/integrations/supabase/client";
import { addDays, format, parseISO } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];
type Availability = Database['public']['Tables']['employee_availability']['Row'];
type TimeOffRequest = Database['public']['Tables']['time_off_requests']['Row'];
type CoverageRequirement = Database['public']['Tables']['coverage_requirements']['Row'];

export async function generateSchedule(weekStartDate: Date, userId: string) {
  try {
    const { error } = await supabase.functions.invoke('generate-schedule', {
      body: { weekStartDate, userId }
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error generating schedule:', error);
    throw error;
  }
}