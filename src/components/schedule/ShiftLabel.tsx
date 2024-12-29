import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getShiftType } from "@/utils/shiftTypeUtils";
import { SHIFT_CONFIGS } from "@/utils/shiftTypeUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ShiftLabelProps {
  shiftType: string;
  currentStaff: number;
  minStaff: number;
  date: string;
  scheduleId?: string;
}

const getShiftColor = (shiftType: string) => {
  switch (shiftType) {
    case "Day Shift Early":
      return "bg-green-100 text-green-800 border-green-200";
    case "Day Shift":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "Swing Shift":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Graveyard":
      return "bg-pink-100 text-pink-800 border-pink-200";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function ShiftLabel({ 
  shiftType, 
  currentStaff, 
  minStaff, 
  date,
  scheduleId 
}: ShiftLabelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const colorClasses = getShiftColor(shiftType);
  const isUnderStaffed = currentStaff < minStaff;
  const config = SHIFT_CONFIGS[shiftType as keyof typeof SHIFT_CONFIGS];
  const requiredStaff = config?.minStaff || minStaff;

  const handleAddEmployee = async () => {
    setLoading(true);
    try {
      // Fetch available shifts for this type
      const { data: shifts } = await supabase
        .from('shifts')
        .select('*')
        .eq('name', shiftType);

      if (!shifts?.length) {
        toast.error("No shifts found for this type");
        return;
      }

      // Get existing assignments for this date
      const { data: existingAssignments } = await supabase
        .from('schedule_assignments')
        .select(`
          employee_id,
          shift:shifts(*)
        `)
        .eq('date', date);

      // Get all employees
      const { data: employees } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employee');

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

      // Filter available employees
      const available = employees.filter(employee => {
        // Skip if already scheduled today
        if (scheduledEmployeeIds.has(employee.id)) return false;

        // Skip if would exceed 40 hours
        const currentHours = employeeHours[employee.id] || 0;
        const wouldExceedLimit = currentHours + calculateShiftHours(shifts[0]) > 40;
        return !wouldExceedLimit;
      });

      setAvailableEmployees(available);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching available employees:', error);
      toast.error("Failed to load available employees");
    } finally {
      setLoading(false);
    }
  };

  const calculateShiftHours = (shift: any) => {
    const start = new Date(`2000-01-01T${shift.start_time}`);
    let end = new Date(`2000-01-01T${shift.end_time}`);
    if (end <= start) {
      end = new Date(`2000-01-02T${shift.end_time}`);
    }
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  };

  const assignEmployee = async (employeeId: string) => {
    try {
      // Get the shift for this type
      const { data: shifts } = await supabase
        .from('shifts')
        .select('*')
        .eq('name', shiftType)
        .limit(1)
        .single();

      if (!shifts) {
        toast.error("No shift found for this type");
        return;
      }

      // Create the assignment
      const { error } = await supabase
        .from('schedule_assignments')
        .insert({
          schedule_id: scheduleId,
          employee_id: employeeId,
          shift_id: shifts.id,
          date: date
        });

      if (error) {
        console.error('Error creating assignment:', error);
        toast.error("Failed to create assignment");
        return;
      }

      toast.success("Employee assigned successfully");
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error assigning employee:', error);
      toast.error("Failed to assign employee");
    }
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={colorClasses}>
          {shiftType}
        </Badge>
        <span className={`text-sm ${isUnderStaffed ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
          ({currentStaff}/{requiredStaff})
        </span>
      </div>
      {scheduleId && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6" 
          onClick={handleAddEmployee}
          disabled={loading}
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Employee to {shiftType}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {availableEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">
                  No available employees found. They might be already scheduled or at their weekly hour limit.
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
    </div>
  );
}