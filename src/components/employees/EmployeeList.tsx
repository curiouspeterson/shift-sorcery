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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CreateEmployeeDialog } from "@/components/CreateEmployeeDialog";
import { useState } from "react";

export function EmployeeList() {
  const [isCreating, setIsCreating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSeedingAvailability, setIsSeedingAvailability] = useState(false);
  const queryClient = useQueryClient();

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

      return data;
    },
  });

  const handleSeedEmployees = async () => {
    try {
      setIsSeeding(true);
      const { error } = await supabase.functions.invoke('seed-employees', {
        method: 'POST'
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Successfully created 20 test employees",
      });
      
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

  const handleSeedAvailability = async () => {
    try {
      setIsSeedingAvailability(true);
      const { error } = await supabase.functions.invoke('seed-employee-availability', {
        method: 'POST'
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Successfully added availability for all employees",
      });
    } catch (error: any) {
      toast({
        title: "Error seeding availability",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSeedingAvailability(false);
    }
  };

  if (isLoading) {
    return <div>Loading employees...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Employees</h2>
        <div className="space-x-2">
          <Button 
            variant="outline"
            onClick={handleSeedEmployees}
            disabled={isSeeding}
          >
            {isSeeding ? "Creating..." : "Add Test Employees"}
          </Button>
          <Button
            variant="outline"
            onClick={handleSeedAvailability}
            disabled={isSeedingAvailability}
          >
            {isSeedingAvailability ? "Adding..." : "Add Test Availability"}
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