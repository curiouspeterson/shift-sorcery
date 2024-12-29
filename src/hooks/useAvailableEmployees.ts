import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEmployeeAvailability } from "./useEmployeeAvailability";
import { useWeeklyHours } from "./useWeeklyHours";
import { isTimeOverlapping } from "@/utils/timeUtils";

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

  const dayOfWeek = new Date(date).getDay();
  const { availability, loading: availabilityLoading } = useEmployeeAvailability(dayOfWeek);
  const { weeklyHours, loading: hoursLoading } = useWeeklyHours(date);

  useEffect(() => {
    if (isOpen && shiftId && date) {
      fetchAvailableEmployees();
    }
    return () => {
      setAvailableEmployees([]);
      setLoading(false);
      setError(null);
    };
  }, [isOpen, shiftId, date, availability, weeklyHours]);

  const fetchAvailableEmployees = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching employees for:', { date, dayOfWeek, shiftId });

      // Get the shift details
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

        // Check if employee has any availability that overlaps with the shift
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
        const currentHours = weeklyHours[employee.id] || 0;
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

  return { 
    availableEmployees, 
    loading: loading || availabilityLoading || hoursLoading, 
    error 
  };
}