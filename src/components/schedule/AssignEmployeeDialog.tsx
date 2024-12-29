import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateShiftHours } from "@/utils/shiftTypeUtils";
import { useQueryClient } from "@tanstack/react-query";

interface AssignEmployeeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId: string;
  date: string;
  scheduleId?: string;
  shiftType: string;
}

export function AssignEmployeeDialog({
  isOpen,
  onOpenChange,
  shiftId,
  date,
  scheduleId,
  shiftType,
}: AssignEmployeeDialogProps) {
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      fetchAvailableEmployees();
    } else {
      // Reset state when dialog closes
      setAvailableEmployees([]);
      setLoading(false);
      setError(null);
    }
  }, [isOpen, shiftId, date]);

  const fetchAvailableEmployees = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const dayOfWeek = new Date(date).getDay();

      // Get existing assignments for this date
      const { data: existingAssignments, error: assignmentsError } = await supabase
        .from('schedule_assignments')
        .select(`
          employee_id,
          shift:shifts(*)
        `)
        .eq('date', date);

      if (assignmentsError) throw assignmentsError;

      // Get all employees with their availability for this day and shift
      const { data: employees, error: employeesError } = await supabase
        .from('profiles')
        .select(`
          *,
          employee_availability!inner(*)
        `)
        .eq('role', 'employee')
        .eq('employee_availability.day_of_week', dayOfWeek)
        .eq('employee_availability.shift_id', shiftId);

      if (employeesError) throw employeesError;

      if (!employees) {
        setAvailableEmployees([]);
        return;
      }

      // Filter out employees already scheduled for this date
      const scheduledEmployeeIds = new Set(
        existingAssignments?.map(a => a.employee_id) || []
      );

      // Get weekly hours for each employee
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const { data: weeklyAssignments, error: weeklyError } = await supabase
        .from('schedule_assignments')
        .select(`
          employee_id,
          shift:shifts(*)
        `)
        .gte('date', weekStart.toISOString().split('T')[0])
        .lte('date', weekEnd.toISOString().split('T')[0]);

      if (weeklyError) throw weeklyError;

      // Calculate weekly hours for each employee
      const employeeHours: Record<string, number> = {};
      weeklyAssignments?.forEach(assignment => {
        const hours = calculateShiftHours(assignment.shift);
        employeeHours[assignment.employee_id] = 
          (employeeHours[assignment.employee_id] || 0) + hours;
      });

      // Get the current shift details
      const { data: currentShift, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', shiftId)
        .single();

      if (shiftError) throw shiftError;

      // Filter available employees
      const available = employees.filter(employee => {
        // Skip if already scheduled today
        if (scheduledEmployeeIds.has(employee.id)) return false;

        // Skip if would exceed weekly hours limit
        const currentHours = employeeHours[employee.id] || 0;
        const wouldExceedLimit = currentHours + calculateShiftHours(currentShift) > employee.weekly_hours_limit;
        return !wouldExceedLimit;
      });

      setAvailableEmployees(available);
    } catch (error: any) {
      console.error('Error fetching available employees:', error);
      setError(error.message);
      toast.error("Failed to load available employees");
    } finally {
      setLoading(false);
    }
  };

  const assignEmployee = async (employeeId: string) => {
    try {
      const { error } = await supabase
        .from('schedule_assignments')
        .insert({
          schedule_id: scheduleId,
          employee_id: employeeId,
          shift_id: shiftId,
          date: date
        });

      if (error) {
        console.error('Error creating assignment:', error);
        toast.error("Failed to create assignment");
        return;
      }

      // Invalidate and refetch the schedule data
      await queryClient.invalidateQueries({ queryKey: ['schedule'] });
      
      toast.success("Employee assigned successfully");
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning employee:', error);
      toast.error("Failed to assign employee");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Employee to {shiftType}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading available employees...
                </span>
              </div>
            ) : error ? (
              <p className="text-sm text-red-500 p-2">
                Error: {error}
              </p>
            ) : availableEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">
                No available employees found for this shift. They might be already scheduled, at their weekly hour limit, or don't have availability for this shift.
              </p>
            ) : (
              availableEmployees.map(employee => (
                <Button
                  key={employee.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => assignEmployee(employee.id)}
                >
                  {employee.first_name} {employee.last_name}
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}