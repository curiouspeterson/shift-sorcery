import { useState } from "react";
import { AvailabilityDayItem } from "./AvailabilityDayItem";
import { AvailabilityEditor } from "./availability/AvailabilityEditor";
import { useAvailabilityMutations } from "@/hooks/useAvailabilityMutations";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface EmployeeAvailabilityFormProps {
  employeeId: string;
  availability: any[];
}

export function EmployeeAvailabilityForm({ employeeId, availability }: EmployeeAvailabilityFormProps) {
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error("No session found");
      }

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

  const { createMutation, updateMutation, deleteMutation } = useAvailabilityMutations(employeeId);

  const handleAddAvailability = (dayOfWeek: number) => {
    setEditingDay(dayOfWeek);
    setSelectedShiftId(null);
  };

  const handleSave = async () => {
    if (editingDay === null || !selectedShiftId) return;

    const existingAvailability = availability?.find(
      (a) => a.day_of_week === editingDay
    );

    try {
      if (existingAvailability) {
        await updateMutation.mutateAsync({
          id: existingAvailability.id,
          shiftId: selectedShiftId,
        });
      } else {
        await createMutation.mutateAsync({
          dayOfWeek: editingDay,
          shiftId: selectedShiftId,
        });
      }

      setEditingDay(null);
      setSelectedShiftId(null);
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      toast.success("Availability updated successfully");
    } catch (error: any) {
      console.error('Error saving availability:', error);
      toast.error("Failed to update availability");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      toast.success("Availability deleted successfully");
    } catch (error) {
      toast.error("Failed to delete availability");
    }
  };

  return (
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
              if (dayAvailability?.shifts) {
                setSelectedShiftId(dayAvailability.shifts.id);
              }
            }}
            onDelete={handleDelete}
            onAdd={handleAddAvailability}
          />
        );
      })}

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
    </div>
  );
}