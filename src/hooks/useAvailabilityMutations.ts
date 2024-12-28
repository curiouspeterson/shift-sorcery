import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAvailabilityMutations(employeeId: string) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async ({ dayOfWeek, startTime, endTime }: { dayOfWeek: number; startTime: string; endTime: string }) => {
      const { data, error } = await supabase
        .from('employee_availability')
        .insert({
          employee_id: employeeId,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', employeeId] });
      toast.success("Availability added successfully");
    },
    onError: (error: any) => {
      toast.error("Error adding availability", {
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, startTime, endTime }: { id: string; startTime: string; endTime: string }) => {
      const { data, error } = await supabase
        .from('employee_availability')
        .update({ 
          start_time: startTime, 
          end_time: endTime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', employeeId] });
      toast.success("Availability updated successfully");
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
      queryClient.invalidateQueries({ queryKey: ['availability', employeeId] });
      toast.success("Availability deleted successfully");
    },
    onError: (error: any) => {
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