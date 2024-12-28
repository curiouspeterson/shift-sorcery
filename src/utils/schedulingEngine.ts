import { supabase } from "@/integrations/supabase/client";
import { addDays, format, parseISO } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];
type Availability = Database['public']['Tables']['employee_availability']['Row'];
type TimeOffRequest = Database['public']['Tables']['time_off_requests']['Row'];
type CoverageRequirement = Database['public']['Tables']['coverage_requirements']['Row'];

export async function generateScheduleForWeek(weekStartDate: Date) {
  try {
    // Get all employees
    const { data: employees } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'employee');

    if (!employees) throw new Error('No employees found');

    // Get coverage requirements
    const { data: coverage } = await supabase
      .from('coverage_requirements')
      .select('*');

    if (!coverage) throw new Error('No coverage requirements found');

    // Get approved time off requests for the week
    const weekEndDate = addDays(weekStartDate, 6);
    const { data: timeOffRequests } = await supabase
      .from('time_off_requests')
      .select('*')
      .eq('status', 'approved')
      .gte('start_date', format(weekStartDate, 'yyyy-MM-dd'))
      .lte('end_date', format(weekEndDate, 'yyyy-MM-dd'));

    // Get employee availability
    const { data: availability } = await supabase
      .from('employee_availability')
      .select('*');

    if (!availability) throw new Error('No availability data found');

    // Create a new schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .insert({
        week_start_date: format(weekStartDate, 'yyyy-MM-dd'),
        status: 'draft',
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (scheduleError || !schedule) throw scheduleError;

    // Generate shifts based on coverage requirements
    const shifts = [];
    for (const req of coverage) {
      // For each day of the week
      for (let day = 0; day < 7; day++) {
        const currentDate = addDays(weekStartDate, day);
        
        // Find available employees for this time slot
        const availableEmployees = employees.filter(emp => {
          // Check if employee has approved time off
          const hasTimeOff = timeOffRequests?.some(
            request => 
              request.employee_id === emp.id &&
              parseISO(request.start_date) <= currentDate &&
              parseISO(request.end_date) >= currentDate
          );

          if (hasTimeOff) return false;

          // Check if employee is available during this time
          const isAvailable = availability.some(
            avail => 
              avail.employee_id === emp.id &&
              avail.day_of_week === day &&
              avail.start_time <= req.start_time &&
              avail.end_time >= req.end_time
          );

          return isAvailable;
        });

        // Assign minimum required employees
        for (let i = 0; i < req.min_employees && i < availableEmployees.length; i++) {
          shifts.push({
            schedule_id: schedule.id,
            employee_id: availableEmployees[i].id,
            date: format(currentDate, 'yyyy-MM-dd'),
            start_time: req.start_time,
            end_time: req.end_time,
          });
        }
      }
    }

    // Insert all shifts
    if (shifts.length > 0) {
      const { error: shiftsError } = await supabase
        .from('schedule_assignments')
        .insert(shifts);

      if (shiftsError) throw shiftsError;
    }

    return schedule.id;
  } catch (error) {
    console.error('Error generating schedule:', error);
    throw error;
  }
}