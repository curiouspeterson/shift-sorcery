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

interface EmployeeAvailabilityDialogProps {
  employee: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeAvailabilityDialog({
  employee,
  open,
  onOpenChange,
}: EmployeeAvailabilityDialogProps) {
  const { data: availability } = useQuery({
    queryKey: ['availability', employee?.id],
    enabled: !!employee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_availability')
        .select('*')
        .eq('employee_id', employee.id);

      if (error) {
        toast.error("Error fetching availability", {
          description: error.message,
        });
        return [];
      }

      return data;
    },
  });

  const getDayName = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {employee?.first_name} {employee?.last_name}'s Availability
          </DialogTitle>
          <DialogDescription>
            Weekly availability schedule
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {availability?.map((slot) => (
            <div key={slot.id} className="flex justify-between items-center p-2 bg-muted rounded-lg">
              <span className="font-medium">{getDayName(slot.day_of_week)}</span>
              <span>
                {slot.start_time} - {slot.end_time}
              </span>
            </div>
          ))}
          {(!availability || availability.length === 0) && (
            <p className="text-muted-foreground text-center py-4">
              No availability set
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}