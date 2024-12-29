import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek } from "date-fns";

export async function getEmployeeStats(weekDate: Date) {
  console.log('📊 Fetching employee statistics...');
  
  try {
    // Get total number of employees
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('id');
    
    if (employeesError) throw employeesError;
    
    // Get employees with shifts for the specified week
    const weekStart = format(startOfWeek(weekDate), 'yyyy-MM-dd');
    const { data: assignments, error: assignmentsError } = await supabase
      .from('schedule_assignments')
      .select('employee_id')
      .eq('date', weekStart)
      .distinct();
    
    if (assignmentsError) throw assignmentsError;
    
    return {
      totalEmployees: employees?.length || 0,
      employeesWithShifts: assignments?.length || 0
    };
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    throw error;
  }
}