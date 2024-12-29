import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek } from "date-fns";

export async function getEmployeeStats(weekDate: Date) {
  console.log('📊 Fetching employee statistics...', {
    weekDate: format(weekDate, 'yyyy-MM-dd')
  });
  
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
      .eq('date', weekStart);
    
    if (assignmentsError) throw assignmentsError;

    const uniqueEmployeesWithShifts = new Set(assignments?.map(a => a.employee_id) || []);
    
    const stats = {
      totalEmployees: employees?.length || 0,
      employeesWithShifts: uniqueEmployeesWithShifts.size
    };

    console.log('✅ Statistics fetched successfully:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Error fetching employee stats:', error);
    throw error;
  }
}