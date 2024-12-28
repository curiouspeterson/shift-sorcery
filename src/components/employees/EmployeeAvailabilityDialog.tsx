import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useAvailabilityMutations } from "@/hooks/useAvailabilityMutations";
import { AvailabilityList } from "./availability/AvailabilityList";
import { AvailabilityEditor } from "./availability/AvailabilityEditor";
import { AvailabilityDialogHeader } from "./availability/AvailabilityDialogHeader";

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

  const { data: availability, isLoading: isLoadingAvailability } = useQuery({
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

  const { createMutation, updateMutation, deleteMutation } = useAvailabilityMutations(employee?.id);

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
    } catch (error) {
      console.error('Error saving availability:', error);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  if (isLoadingAvailability) {
    return <div>Loading...</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <AvailabilityDialogHeader
          firstName={employee?.first_name}
          lastName={employee?.last_name}
          employeeId={employee?.id}
        />

        <AvailabilityList
          availability={availability || []}
          onEdit={(dayIndex, shift) => {
            setEditingDay(dayIndex);
            setSelectedShiftId(shift?.id || null);
          }}
          onDelete={handleDelete}
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