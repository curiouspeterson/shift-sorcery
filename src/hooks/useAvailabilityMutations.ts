import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAvailabilityMutations(employeeId: string) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async ({ dayOfWeek, shiftId }: { dayOfWeek: number; shiftId: string }) => {
      const { data, error } = await supabase
        .from('employee_availability')
        .insert({
          employee_id: employeeId,
          day_of_week: dayOfWeek,
          shift_id: shiftId,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', employeeId] });
      toast.success("Availability added successfully");
    },
    onError: (error: any) => {
      console.error("Create availability error:", error);
      toast.error("Error adding availability", {
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, shiftId }: { id: string; shiftId: string }) => {
      const { error } = await supabase
        .from('employee_availability')
        .update({ 
          shift_id: shiftId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', employeeId] });
      toast.success("Availability updated successfully");
    },
    onError: (error: any) => {
      console.error("Update availability error:", error);
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
      queryClient.invalidateQueries({ queryKey: ['availability', employeeId] });
      toast.success("Availability deleted successfully");
    },
    onError: (error: any) => {
      console.error("Delete availability error:", error);
      toast.error("Error deleting availability", {
        description: error.message,
      });
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
}