import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export function ShiftManagement() {
  const [newShift, setNewShift] = useState({
    name: "",
    startTime: "09:00",
    endTime: "17:00",
  });

  const queryClient = useQueryClient();

  const { data: shifts, isLoading } = useQuery({
    queryKey: ["shifts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const createShiftMutation = useMutation({
    mutationFn: async (shiftData: typeof newShift) => {
      const { data, error } = await supabase.from("shifts").insert([
        {
          name: shiftData.name,
          start_time: shiftData.startTime,
          end_time: shiftData.endTime,
        },
      ]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Shift created successfully");
      setNewShift({ name: "", startTime: "09:00", endTime: "17:00" });
    },
    onError: (error: any) => {
      toast.error("Failed to create shift: " + error.message);
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      try {
        // Delete schedule assignments first
        const { error: scheduleError } = await supabase
          .from("schedule_assignments")
          .delete()
          .eq("shift_id", shiftId);
        
        if (scheduleError) {
          throw new Error(`Failed to delete schedule assignments: ${scheduleError.message}`);
        }

        // Then delete employee availability
        const { error: availabilityError } = await supabase
          .from("employee_availability")
          .delete()
          .eq("shift_id", shiftId);
        
        if (availabilityError) {
          throw new Error(`Failed to delete employee availability: ${availabilityError.message}`);
        }

        // Finally delete the shift
        const { error: shiftError } = await supabase
          .from("shifts")
          .delete()
          .eq("id", shiftId);
        
        if (shiftError) {
          throw new Error(`Failed to delete shift: ${shiftError.message}`);
        }

        return true;
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(error.message);
        }
        throw new Error('An unexpected error occurred while deleting the shift');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Shift deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createShiftMutation.mutate(newShift);
  };

  if (isLoading) return <div>Loading shifts...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Shift</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                placeholder="Shift Name"
                value={newShift.name}
                onChange={(e) =>
                  setNewShift({ ...newShift, name: e.target.value })
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  type="time"
                  value={newShift.startTime}
                  onChange={(e) =>
                    setNewShift({ ...newShift, startTime: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Input
                  type="time"
                  value={newShift.endTime}
                  onChange={(e) =>
                    setNewShift({ ...newShift, endTime: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <Button type="submit">Create Shift</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {shifts?.map((shift) => (
              <div
                key={shift.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-medium">{shift.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(`2000-01-01T${shift.start_time}`), "h:mm a")}{" "}
                    -{" "}
                    {format(new Date(`2000-01-01T${shift.end_time}`), "h:mm a")}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteShiftMutation.mutate(shift.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}