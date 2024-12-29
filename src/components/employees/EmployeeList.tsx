import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeCard } from "./EmployeeCard";

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
        throw error;
      }

      // Filter out duplicates based on id
      const uniqueEmployees = data.reduce((acc: any[], current: any) => {
        const exists = acc.find((item) => item.id === current.id);
        if (!exists) {
          acc.push(current);
        } else {
          console.warn(`Duplicate employee found with id: ${current.id}`);
        }
        return acc;
      }, []);

      return uniqueEmployees;
    },
  });

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
        <EmployeeCard key={employee.id} employee={employee} />
      ))}
    </div>
  );
}