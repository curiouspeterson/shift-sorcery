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
import { useAvailabilityMutations } from "@/hooks/useAvailabilityMutations";
import { AvailabilityList } from "./availability/AvailabilityList";
import { AvailabilityEditor } from "./availability/AvailabilityEditor";

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
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: availability } = useQuery({
    queryKey: ['availability', employee?.id],
    enabled: !!employee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_availability')
        .select('*, shifts (*)')
        .eq('employee_id', employee.id);

      if (error) {
        toast.error("Error fetching availability");
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
    setSelectedShiftId(null);
  };

  const handleSave = async () => {
    if (editingDay === null || !selectedShiftId) return;

    const shift = shifts?.find(s => s.id === selectedShiftId);
    if (!shift) return;

    const existingAvailability = availability?.find(
      (a) => a.day_of_week === editingDay
    );

    if (existingAvailability) {
      updateMutation.mutate({
        id: existingAvailability.id,
        startTime: shift.start_time,
        endTime: shift.end_time,
      });
    } else {
      createMutation.mutate({
        dayOfWeek: editingDay,
        startTime: shift.start_time,
        endTime: shift.end_time,
      });
    }
    setEditingDay(null);
    setSelectedShiftId(null);
  };

  const testAvailabilityMutation = useMutation({
    mutationFn: async () => {
      if (!shifts?.length) {
        throw new Error("No shifts available");
      }

      // Delete existing availability
      const { error: deleteError } = await supabase
        .from('employee_availability')
        .delete()
        .eq('employee_id', employee.id);

      if (deleteError) throw deleteError;

      // Randomly choose between 4x10 or 3x12+4 schedule pattern
      const usesTenHourShifts = Math.random() < 0.5;
      
      let selectedShift;
      let startDay = Math.floor(Math.random() * 4); // Random start day (0-3)
      
      if (usesTenHourShifts) {
        // Find 10-hour shifts
        const tenHourShifts = shifts.filter(s => {
          const startHour = parseInt(s.start_time.split(':')[0]);
          const endHour = parseInt(s.end_time.split(':')[0]);
          const duration = (endHour < startHour ? endHour + 24 : endHour) - startHour;
          return duration === 10;
        });
        
        if (tenHourShifts.length === 0) throw new Error("No 10-hour shifts available");
        selectedShift = tenHourShifts[Math.floor(Math.random() * tenHourShifts.length)];
        
        // Create availability for 4 consecutive days
        const availabilityPromises = Array.from({ length: 4 }, (_, i) => {
          const dayOfWeek = (startDay + i) % 7;
          return supabase
            .from('employee_availability')
            .insert({
              employee_id: employee.id,
              day_of_week: dayOfWeek,
              start_time: selectedShift.start_time,
              end_time: selectedShift.end_time,
            });
        });
        
        await Promise.all(availabilityPromises);
      } else {
        // Find 12-hour and 4-hour shifts
        const twelveHourShifts = shifts.filter(s => {
          const startHour = parseInt(s.start_time.split(':')[0]);
          const endHour = parseInt(s.end_time.split(':')[0]);
          const duration = (endHour < startHour ? endHour + 24 : endHour) - startHour;
          return duration === 12;
        });
        
        const fourHourShifts = shifts.filter(s => {
          const startHour = parseInt(s.start_time.split(':')[0]);
          const endHour = parseInt(s.end_time.split(':')[0]);
          const duration = (endHour < startHour ? endHour + 24 : endHour) - startHour;
          return duration === 4;
        });
        
        if (twelveHourShifts.length === 0 || fourHourShifts.length === 0) {
          throw new Error("Required shifts not available");
        }
        
        const selectedTwelveHourShift = twelveHourShifts[Math.floor(Math.random() * twelveHourShifts.length)];
        const selectedFourHourShift = fourHourShifts[Math.floor(Math.random() * fourHourShifts.length)];
        
        // Create availability for 3 twelve-hour shifts and 1 four-hour shift
        const availabilityPromises = [
          // Three 12-hour shifts
          ...Array.from({ length: 3 }, (_, i) => {
            const dayOfWeek = (startDay + i) % 7;
            return supabase
              .from('employee_availability')
              .insert({
                employee_id: employee.id,
                day_of_week: dayOfWeek,
                start_time: selectedTwelveHourShift.start_time,
                end_time: selectedTwelveHourShift.end_time,
              });
          }),
          // One 4-hour shift
          supabase
            .from('employee_availability')
            .insert({
              employee_id: employee.id,
              day_of_week: (startDay + 3) % 7,
              start_time: selectedFourHourShift.start_time,
              end_time: selectedFourHourShift.end_time,
            })
        ];
        
        await Promise.all(availabilityPromises);
      }
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

        <AvailabilityList
          availability={availability || []}
          onEdit={(dayIndex, shift) => {
            setEditingDay(dayIndex);
            setSelectedShiftId(shift?.id || null);
          }}
          onDelete={(id) => deleteMutation.mutate(id)}
          onAdd={handleAddAvailability}
        />

        <AvailabilityEditor
          editingDay={editingDay}
          selectedShiftId={selectedShiftId}
          onShiftChange={setSelectedShiftId}
          onCancel={() => {
            setEditingDay(null);
            setSelectedShiftId(null);
          }}
          onSave={handleSave}
        />
      </DialogContent>
    </Dialog>
  );
}