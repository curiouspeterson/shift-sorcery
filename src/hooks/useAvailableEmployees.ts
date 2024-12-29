import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  weekly_hours_limit: number;
}

export function useAvailableEmployees(
  isOpen: boolean,
  shiftId: string,
  date: string
) {
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && shiftId && date) {
      fetchAvailableEmployees();
    }
    return () => {
      setAvailableEmployees([]);
      setLoading(false);
      setError(null);
    };
  }, [isOpen, shiftId, date]);

  const fetchAvailableEmployees = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const dayOfWeek = new Date(date).getDay();
      console.log('Fetching employees for:', { date, dayOfWeek, shiftId });

      // Get the shift details first for time comparison
      const { data: shiftDetails, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', shiftId)
        .single();

      if (shiftError) throw shiftError;
      console.log('Shift details:', shiftDetails);

      // Get all employees
      const { data: employees, error: employeesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employee');

      if (employeesError) throw employeesError;
      console.log('Found employees:', employees?.length || 0);

      if (!employees) {
        setAvailableEmployees([]);
        return;
      }

      // Get existing assignments for this date
      const { data: existingAssignments, error: assignmentsError } = await supabase
        .from('schedule_assignments')
        .select('employee_id')
        .eq('date', date);

      if (assignmentsError) throw assignmentsError;
      console.log('Existing assignments:', existingAssignments?.length || 0);

      // Get availability for this day
      const { data: availability, error: availabilityError } = await supabase
        .from('employee_availability')
        .select('*')
        .eq('day_of_week', dayOfWeek);

      if (availabilityError) throw availabilityError;
      console.log('Found availability records:', availability?.length || 0);

      // Get weekly assignments to check hours
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const { data: weeklyAssignments, error: weeklyError } = await supabase
        .from('schedule_assignments')
        .select(`
          employee_id,
          shift:shifts(duration_hours)
        `)
        .gte('date', weekStart.toISOString().split('T')[0])
        .lte('date', weekEnd.toISOString().split('T')[0]);

      if (weeklyError) throw weeklyError;

      // Calculate weekly hours for each employee
      const employeeHours: Record<string, number> = {};
      weeklyAssignments?.forEach(assignment => {
        const hours = assignment.shift?.duration_hours || 0;
        employeeHours[assignment.employee_id] = 
          (employeeHours[assignment.employee_id] || 0) + Number(hours);
      });

      // Filter available employees
      const scheduledEmployeeIds = new Set(
        existingAssignments?.map(a => a.employee_id) || []
      );

      const available = employees.filter(employee => {
        // Skip if already scheduled today
        if (scheduledEmployeeIds.has(employee.id)) {
          console.log(`Employee ${employee.id} already scheduled today`);
          return false;
        }

        // Check if employee has any availability for this day that overlaps with the shift
        const employeeAvailability = availability?.filter(a => 
          a.employee_id === employee.id &&
          isTimeOverlapping(
            shiftDetails.start_time,
            shiftDetails.end_time,
            a.start_time,
            a.end_time
          )
        );

        if (!employeeAvailability?.length) {
          console.log(`Employee ${employee.id} has no overlapping availability for this shift`);
          return false;
        }

        // Skip if would exceed weekly hours limit
        const currentHours = employeeHours[employee.id] || 0;
        const wouldExceedLimit = currentHours + Number(shiftDetails?.duration_hours || 0) > employee.weekly_hours_limit;
        
        if (wouldExceedLimit) {
          console.log(`Employee ${employee.id} would exceed weekly hours limit`);
          return false;
        }

        return true;
      });

      console.log('Available employees after filtering:', available);
      setAvailableEmployees(available);
    } catch (error: any) {
      console.error('Error fetching available employees:', error);
      setError(error.message);
      toast.error("Failed to load available employees");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if time ranges overlap
  const isTimeOverlapping = (
    shift_start: string,
    shift_end: string,
    avail_start: string,
    avail_end: string
  ): boolean => {
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const shiftStart = parseTime(shift_start);
    let shiftEnd = parseTime(shift_end);
    const availStart = parseTime(avail_start);
    let availEnd = parseTime(avail_end);

    // Handle overnight shifts
    if (shiftEnd <= shiftStart) shiftEnd += 24 * 60;
    if (availEnd <= availStart) availEnd += 24 * 60;

    return (shiftStart < availEnd && shiftEnd > availStart);
  };

  return { availableEmployees, loading, error };
}