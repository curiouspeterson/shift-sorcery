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
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Failed to create availability");
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
    mutationFn: async ({ id, startTime, endTime }: { id: string; startTime: string; endTime: string }) => {
      // First check if the record exists
      const { data: existingRecord, error: checkError } = await supabase
        .from('employee_availability')
        .select('*')
        .eq('id', id)
        .limit(1)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking availability record:", checkError);
        throw new Error("Failed to check availability record");
      }

      if (!existingRecord) {
        throw new Error("Availability record not found");
      }

      // If record exists, proceed with update
      const { data, error } = await supabase
        .from('employee_availability')
        .update({ 
          start_time: startTime, 
          end_time: endTime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        console.error("Error updating availability:", error);
        throw error;
      }

      if (!data) {
        throw new Error("Failed to update availability");
      }

      return data;
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