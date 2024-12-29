import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeCard } from "./EmployeeCard";
import { toast } from "sonner";

export function EmployeeList() {
  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("first_name");

      if (error) {
        console.error("Error fetching employees:", error);
        toast.error("Failed to fetch employees");
        throw error;
      }

      // Filter out duplicates based on id and log warnings
      const employeeMap = new Map();
      data.forEach(employee => {
        if (employeeMap.has(employee.id)) {
          console.warn(`⚠️ Duplicate employee found with ID: ${employee.id}`, {
            existing: employeeMap.get(employee.id),
            duplicate: employee
          });
        } else {
          employeeMap.set(employee.id, employee);
        }
      });

      const uniqueEmployees = Array.from(employeeMap.values());
      console.log(`📊 Total unique employees: ${uniqueEmployees.length}`);
      return uniqueEmployees;
    },
  });

  const handleDeleteEmployee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Employee deleted successfully");
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast.error("Failed to delete employee");
    }
  };

  const handleViewSchedule = (employee: any) => {
    console.log('View schedule for employee:', employee);
    // This will be implemented later when schedule viewing is added
    toast.info("Schedule viewing will be implemented soon");
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-48 bg-muted animate-pulse rounded-lg"
          ></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {employees?.map((employee) => (
        <EmployeeCard 
          key={employee.id} 
          employee={employee}
          onDelete={handleDeleteEmployee}
          onViewSchedule={handleViewSchedule}
        />
      ))}
    </div>
  );
}