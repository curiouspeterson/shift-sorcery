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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AssignEmployeeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId: string;
  date: string;
  scheduleId?: string;
  shiftType: string;
  availableEmployees: any[];
  isLoading: boolean;
}

export function AssignEmployeeDialog({
  isOpen,
  onOpenChange,
  shiftId,
  date,
  scheduleId,
  shiftType,
  availableEmployees,
  isLoading
}: AssignEmployeeDialogProps) {
  const queryClient = useQueryClient();

  const assignEmployee = async (employeeId: string) => {
    try {
      console.log('Assigning employee:', employeeId, 'to shift:', shiftId);
      
      if (!scheduleId) {
        console.error('No schedule ID provided');
        throw new Error('Schedule ID is required');
      }

      const { error: assignmentError } = await supabase
        .from('schedule_assignments')
        .insert({
          schedule_id: scheduleId,
          employee_id: employeeId,
          shift_id: shiftId,
          date: date
        });

      if (assignmentError) {
        console.error('Error creating assignment:', assignmentError);
        throw assignmentError;
      }

      await queryClient.invalidateQueries({ 
        queryKey: ['schedule']
      });
      
      toast.success("Employee assigned successfully");
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error assigning employee:', error);
      toast.error(error.message || "Failed to assign employee");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Employee to {shiftType}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[300px]">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : availableEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              No available employees found for this shift. They might be already scheduled, 
              at their weekly hour limit, or don't have availability for this shift.
            </p>
          ) : (
            <div className="space-y-2 p-2">
              {availableEmployees.map(employee => (
                <Button
                  key={employee.id}
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => assignEmployee(employee.id)}
                >
                  <span>{employee.first_name} {employee.last_name}</span>
                  <Badge variant="secondary">
                    {employee.weekly_hours_limit}h limit
                  </Badge>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}