import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { CreateEmployeeDialog } from "@/components/CreateEmployeeDialog";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function EmployeesView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) {
        toast({
          title: "Error fetching employees",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }

      return data as Profile[];
    },
  });

  const handleSeedEmployees = async () => {
    try {
      setIsSeeding(true);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-employees`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );
      
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      
      toast({
        title: "Success",
        description: "Successfully created 20 test employees",
      });
      
      // Refresh the employees list
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
    } catch (error: any) {
      toast({
        title: "Error seeding employees",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading employees...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Employees</h1>
        <div className="space-x-2">
          <Button 
            variant="outline"
            onClick={handleSeedEmployees}
            disabled={isSeeding}
          >
            {isSeeding ? "Creating..." : "Add Test Employees"}
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees?.map((employee) => (
          <Card key={employee.id}>
            <CardHeader>
              <CardTitle>
                {employee.first_name} {employee.last_name}
              </CardTitle>
              <CardDescription>
                {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    toast({
                      title: "Coming soon",
                      description: "This feature is not yet implemented.",
                    });
                  }}
                >
                  View Availability
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    toast({
                      title: "Coming soon",
                      description: "This feature is not yet implemented.",
                    });
                  }}
                >
                  View Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateEmployeeDialog
        open={isCreating}
        onOpenChange={setIsCreating}
      />
    </div>
  );
}