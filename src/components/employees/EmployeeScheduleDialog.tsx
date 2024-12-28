import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EmployeeScheduleDialogProps {
  employee: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeScheduleDialog({
  employee,
  open,
  onOpenChange,
}: EmployeeScheduleDialogProps) {
  const { data: schedules } = useQuery({
    queryKey: ['schedules', employee?.id],
    enabled: !!employee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_assignments')
        .select(`
          *,
          schedules (*),
          shifts (*)
        `)
        .eq('employee_id', employee.id)
        .order('date', { ascending: false });

      if (error) {
        toast.error("Error fetching schedules", {
          description: error.message,
        });
        return [];
      }

      return data;
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {employee?.first_name} {employee?.last_name}'s Schedule
          </DialogTitle>
          <DialogDescription>
            Upcoming and past shifts
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {schedules?.map((assignment) => (
            <div key={assignment.id} className="flex justify-between items-center p-2 bg-muted rounded-lg">
              <span className="font-medium">
                {format(new Date(assignment.date), 'MMM d, yyyy')}
              </span>
              <span>
                {assignment.shifts.start_time} - {assignment.shifts.end_time}
              </span>
            </div>
          ))}
          {(!schedules || schedules.length === 0) && (
            <p className="text-muted-foreground text-center py-4">
              No scheduled shifts
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}