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
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

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
    if (isOpen && shiftId && date) {
      fetchAvailableEmployees();
    }
    // Reset state when dialog closes
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

      // Get the shift details first
      const { data: shiftDetails, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', shiftId)
        .single();

      if (shiftError) throw shiftError;

      // Get existing assignments for this date
      const { data: existingAssignments, error: assignmentsError } = await supabase
        .from('schedule_assignments')
        .select('employee_id')
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

      console.log('Found employees:', employees);

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
        const hours = assignment.shift.duration_hours || 0;
        employeeHours[assignment.employee_id] = 
          (employeeHours[assignment.employee_id] || 0) + hours;
      });

      // Filter available employees
      const available = employees.filter(employee => {
        // Skip if already scheduled today
        if (scheduledEmployeeIds.has(employee.id)) {
          console.log(`Employee ${employee.id} already scheduled today`);
          return false;
        }

        // Skip if would exceed weekly hours limit
        const currentHours = employeeHours[employee.id] || 0;
        const wouldExceedLimit = currentHours + (shiftDetails.duration_hours || 0) > employee.weekly_hours_limit;
        
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

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['schedule'] });
      toast.success("Employee assigned successfully");
      onOpenChange(false);
    } catch (error: any) {
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
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
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