import { useState } from "react";
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
  const queryClient = useQueryClient();

  const fetchAvailableEmployees = async () => {
    setLoading(true);
    try {
      // Get the day of week (0-6) for the given date
      const dayOfWeek = new Date(date).getDay();

      // Get existing assignments for this date
      const { data: existingAssignments } = await supabase
        .from('schedule_assignments')
        .select(`
          employee_id,
          shift:shifts(*)
        `)
        .eq('date', date);

      // Get all employees with their availability for this day and shift
      const { data: employees } = await supabase
        .from('profiles')
        .select(`
          *,
          employee_availability!inner(*)
        `)
        .eq('role', 'employee')
        .eq('employee_availability.day_of_week', dayOfWeek)
        .eq('employee_availability.shift_id', shiftId);

      if (!employees) {
        toast.error("No employees found");
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

      const { data: weeklyAssignments } = await supabase
        .from('schedule_assignments')
        .select(`
          employee_id,
          shift:shifts(*)
        `)
        .gte('date', weekStart.toISOString().split('T')[0])
        .lte('date', weekEnd.toISOString().split('T')[0]);

      // Calculate weekly hours for each employee
      const employeeHours: Record<string, number> = {};
      weeklyAssignments?.forEach(assignment => {
        const hours = calculateShiftHours(assignment.shift);
        employeeHours[assignment.employee_id] = 
          (employeeHours[assignment.employee_id] || 0) + hours;
      });

      // Get the current shift details
      const { data: currentShift } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', shiftId)
        .single();

      if (!currentShift) {
        toast.error("Shift not found");
        return;
      }

      // Filter available employees
      const available = employees.filter(employee => {
        // Skip if already scheduled today
        if (scheduledEmployeeIds.has(employee.id)) return false;

        // Skip if would exceed 40 hours
        const currentHours = employeeHours[employee.id] || 0;
        const wouldExceedLimit = currentHours + calculateShiftHours(currentShift) > employee.weekly_hours_limit;
        return !wouldExceedLimit;
      });

      setAvailableEmployees(available);
    } catch (error) {
      console.error('Error fetching available employees:', error);
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

  // Fetch available employees when dialog opens
  if (isOpen && !loading && availableEmployees.length === 0) {
    fetchAvailableEmployees();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Employee to {shiftType}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground p-2">
                Loading available employees...
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