import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { AvailabilityTimeSelect } from "./AvailabilityTimeSelect";
import { AvailabilityDayItem } from "./AvailabilityDayItem";
import { useAvailabilityMutations } from "@/hooks/useAvailabilityMutations";

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
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const queryClient = useQueryClient();

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

  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('start_time');

      if (error) {
        toast.error("Error fetching shifts");
        return [];
      }

      return data;
    },
  });

  const { createMutation, updateMutation, deleteMutation } = useAvailabilityMutations(employee?.id);

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
      createMutation.mutate({
        dayOfWeek: editingDay,
        startTime,
        endTime,
      });
    }
    setEditingDay(null);
  };

  const testAvailabilityMutation = useMutation({
    mutationFn: async () => {
      // Select a random shift
      if (!shifts?.length) {
        throw new Error("No shifts available");
      }
      const randomShift = shifts[Math.floor(Math.random() * shifts.length)];
      
      // Delete existing availability
      const { error: deleteError } = await supabase
        .from('employee_availability')
        .delete()
        .eq('employee_id', employee.id);

      if (deleteError) throw deleteError;

      // Create new availability for Monday through Friday
      const availabilityPromises = [1, 2, 3, 4, 5].map(dayOfWeek => 
        supabase
          .from('employee_availability')
          .insert({
            employee_id: employee.id,
            day_of_week: dayOfWeek,
            start_time: randomShift.start_time,
            end_time: randomShift.end_time,
          })
      );

      await Promise.all(availabilityPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', employee?.id] });
      toast.success("Test availability created successfully");
    },
    onError: (error: any) => {
      toast.error("Error creating test availability", {
        description: error.message,
      });
    },
  });

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

        <div className="flex justify-end mb-4">
          <Button 
            variant="outline"
            onClick={() => testAvailabilityMutation.mutate()}
            disabled={testAvailabilityMutation.isPending}
          >
            Test Availability
          </Button>
        </div>

        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day, index) => {
            const dayAvailability = availability?.find(
              (a) => a.day_of_week === index
            );

            return (
              <AvailabilityDayItem
                key={index}
                day={day}
                dayIndex={index}
                availability={dayAvailability}
                onEdit={(dayIndex) => {
                  setEditingDay(dayIndex);
                  if (dayAvailability) {
                    setStartTime(dayAvailability.start_time);
                    setEndTime(dayAvailability.end_time);
                  }
                }}
                onDelete={(id) => deleteMutation.mutate(id)}
                onAdd={handleAddAvailability}
              />
            );
          })}
        </div>

        {editingDay !== null && (
          <div className="space-y-4 mt-4 p-4 border rounded-lg">
            <h3 className="font-medium">
              {editingDay !== null ? `Edit ${DAYS_OF_WEEK[editingDay]} Availability` : 'Add Availability'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <AvailabilityTimeSelect
                label="Start Time"
                value={startTime}
                onValueChange={setStartTime}
              />
              <AvailabilityTimeSelect
                label="End Time"
                value={endTime}
                onValueChange={setEndTime}
              />
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