import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Pencil, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return `${hour}:00`;
});

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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
  const queryClient = useQueryClient();
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

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

  const createMutation = useMutation({
    mutationFn: async (dayOfWeek: number) => {
      const { error } = await supabase
        .from('employee_availability')
        .insert({
          employee_id: employee.id,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', employee?.id] });
      toast.success("Availability added successfully");
      setEditingDay(null);
    },
    onError: (error: any) => {
      toast.error("Error adding availability", {
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, startTime, endTime }: { id: string; startTime: string; endTime: string }) => {
      const { error } = await supabase
        .from('employee_availability')
        .update({ start_time: startTime, end_time: endTime })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', employee?.id] });
      toast.success("Availability updated successfully");
      setEditingDay(null);
    },
    onError: (error: any) => {
      toast.error("Error updating availability", {
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employee_availability')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', employee?.id] });
      toast.success("Availability deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Error deleting availability", {
        description: error.message,
      });
    },
  });

  const handleAddAvailability = (dayOfWeek: number) => {
    setEditingDay(dayOfWeek);
    setStartTime("09:00");
    setEndTime("17:00");
  };

  const handleSave = () => {
    if (editingDay === null) return;

    const existingAvailability = availability?.find(
      (a) => a.day_of_week === editingDay
    );

    if (existingAvailability) {
      updateMutation.mutate({
        id: existingAvailability.id,
        startTime,
        endTime,
      });
    } else {
      createMutation.mutate(editingDay);
    }
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
          {DAYS_OF_WEEK.map((day, index) => {
            const dayAvailability = availability?.find(
              (a) => a.day_of_week === index
            );

            return (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                <span className="font-medium">{day}</span>
                {dayAvailability ? (
                  <div className="flex items-center gap-2">
                    <span>
                      {format(new Date(`2024-01-01T${dayAvailability.start_time}`), 'h:mm a')} -{' '}
                      {format(new Date(`2024-01-01T${dayAvailability.end_time}`), 'h:mm a')}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingDay(index);
                        setStartTime(dayAvailability.start_time);
                        setEndTime(dayAvailability.end_time);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(dayAvailability.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddAvailability(index)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Availability
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {editingDay !== null && (
          <div className="space-y-4 mt-4 p-4 border rounded-lg">
            <h3 className="font-medium">
              {editingDay !== null ? `Edit ${DAYS_OF_WEEK[editingDay]} Availability` : 'Add Availability'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {format(new Date(`2024-01-01T${time}`), 'h:mm a')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Time</label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {format(new Date(`2024-01-01T${time}`), 'h:mm a')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingDay(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}