import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, Clock, Trash2, Edit } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

export function EmployeeList() {
  const [isCreating, setIsCreating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSeedingAvailability, setIsSeedingAvailability] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showAvailability, setShowAvailability] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
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

  const { data: availability } = useQuery({
    queryKey: ['availability', selectedEmployee?.id],
    enabled: !!selectedEmployee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_availability')
        .select('*')
        .eq('employee_id', selectedEmployee.id);

      if (error) {
        toast.error("Error fetching availability", {
          description: error.message,
        });
        return [];
      }

      return data;
    },
  });

  const { data: schedules } = useQuery({
    queryKey: ['schedules', selectedEmployee?.id],
    enabled: !!selectedEmployee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_assignments')
        .select(`
          *,
          schedules (*),
          shifts (*)
        `)
        .eq('employee_id', selectedEmployee.id)
        .order('date', { ascending: false });

      if (error) {
        toast.error("Error fetching schedules", {
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
      setIsSeeding(true);
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
      
      toast.success("Successfully added availability for all employees");
    } catch (error: any) {
      toast.error("Error seeding availability", {
        description: error.message,
      });
    } finally {
      setIsSeedingAvailability(false);
    }
  };

  const getDayName = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
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
                    setSelectedEmployee(employee);
                    setShowAvailability(true);
                  }}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  View Availability
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedEmployee(employee);
                    setShowSchedule(true);
                  }}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  View Schedule
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleDeleteEmployee(employee.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Employee
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

      <Dialog open={showAvailability} onOpenChange={setShowAvailability}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee?.first_name} {selectedEmployee?.last_name}'s Availability
            </DialogTitle>
            <DialogDescription>
              Weekly availability schedule
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {availability?.map((slot) => (
              <div key={slot.id} className="flex justify-between items-center p-2 bg-muted rounded-lg">
                <span className="font-medium">{getDayName(slot.day_of_week)}</span>
                <span>
                  {slot.start_time} - {slot.end_time}
                </span>
              </div>
            ))}
            {(!availability || availability.length === 0) && (
              <p className="text-muted-foreground text-center py-4">
                No availability set
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee?.first_name} {selectedEmployee?.last_name}'s Schedule
            </DialogTitle>
            <DialogDescription>
              Upcoming and past shifts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {schedules?.map((assignment) => (
              <div key={assignment.id} className="flex justify-between items-center p-2 bg-muted rounded-lg">
                <span className="font-medium">
                  {format(new Date(assignment.date), 'MMM d, yyyy')}
                </span>
                <span>
                  {assignment.shifts.start_time} - {assignment.shifts.end_time}
                </span>
              </div>
            ))}
            {(!schedules || schedules.length === 0) && (
              <p className="text-muted-foreground text-center py-4">
                No scheduled shifts
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}