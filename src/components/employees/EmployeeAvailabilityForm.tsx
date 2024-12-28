import { useState } from "react";
import { AvailabilityDayItem } from "./AvailabilityDayItem";
import { AvailabilityEditor } from "./availability/AvailabilityEditor";
import { useAvailabilityMutations } from "@/hooks/useAvailabilityMutations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('start_time');

      if (error) throw error;
      return data;
    },
  });

  const { createMutation, updateMutation, deleteMutation } = useAvailabilityMutations(employeeId);

  const handleAddAvailability = (dayOfWeek: number) => {
    setEditingDay(dayOfWeek);
    setSelectedShiftId(null);
  };

  const handleSave = () => {
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
            onDelete={(id) => deleteMutation.mutate(id)}
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