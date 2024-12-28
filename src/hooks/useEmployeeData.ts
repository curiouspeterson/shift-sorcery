import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useEmployeeData() {
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) {
        toast.error("Error fetching employees", {
          description: error.message,
        });
        return [];
      }

      return data;
    },
  });

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', employeeId);

      if (error) throw error;

      toast.success("Employee deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    } catch (error: any) {
      toast.error("Error deleting employee", {
        description: error.message,
      });
    }
  };

  const handleSeedEmployees = async () => {
    try {
      const { error } = await supabase.functions.invoke('seed-employees', {
        method: 'POST'
      });
      
      if (error) throw error;
      
      toast.success("Successfully created 20 test employees");
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    } catch (error: any) {
      toast.error("Error seeding employees", {
        description: error.message,
      });
    }
  };

  const handleSeedAvailability = async () => {
    try {
      const { error } = await supabase.functions.invoke('seed-employee-availability', {
        method: 'POST'
      });
      
      if (error) throw error;
      
      toast.success("Successfully added availability for all employees");
    } catch (error: any) {
      toast.error("Error seeding availability", {
        description: error.message,
      });
    }
  };

  return {
    employees,
    isLoading,
    handleDeleteEmployee,
    handleSeedEmployees,
    handleSeedAvailability,
  };
}