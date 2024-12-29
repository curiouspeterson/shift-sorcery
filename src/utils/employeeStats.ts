import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addDays } from "date-fns";

export async function getEmployeeStats(weekDate: Date) {
  console.log('📊 Fetching employee statistics...', {
    weekDate: format(weekDate, 'yyyy-MM-dd')
  });
  
  try {
    // Get total number of employees
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'employee');
    
    if (employeesError) throw employeesError;
    
    // Get employees with shifts for the specified week
    const weekStart = startOfWeek(weekDate);
    const weekDates = Array.from({ length: 7 }, (_, i) => 
      format(addDays(weekStart, i), 'yyyy-MM-dd')
    );
    
    console.log('📅 Fetching assignments for dates:', weekDates);
    
    const { data: assignments, error: assignmentsError } = await supabase
      .from('schedule_assignments')
      .select('employee_id, date')
      .in('date', weekDates);
    
    if (assignmentsError) throw assignmentsError;

    const uniqueEmployeesWithShifts = new Set(assignments?.map(a => a.employee_id) || []);
    
    const stats = {
      totalEmployees: employees?.length || 0,
      employeesWithShifts: uniqueEmployeesWithShifts.size,
      weekDates
    };

    console.log('✅ Statistics fetched successfully:', stats);
    console.log('👥 Employees with shifts:', Array.from(uniqueEmployeesWithShifts));
    return stats;
  } catch (error) {
    console.error('❌ Error fetching employee stats:', error);
    throw error;
  }
}