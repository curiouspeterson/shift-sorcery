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
import { useAvailableEmployees } from "@/hooks/useAvailableEmployees";
import { LoadingState } from "./employee-dialog/LoadingState";
import { ErrorState } from "./employee-dialog/ErrorState";
import { EmployeeList } from "./employee-dialog/EmployeeList";

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
  const queryClient = useQueryClient();
  const { availableEmployees, loading, error } = useAvailableEmployees(
    isOpen,
    shiftId,
    date
  );

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
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : (
            <EmployeeList 
              employees={availableEmployees} 
              onAssign={assignEmployee} 
            />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}