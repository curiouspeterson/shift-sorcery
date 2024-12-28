import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function ScheduleGenerator() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: shifts } = useQuery({
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

  const generateScheduleMutation = useMutation({
    mutationFn: async () => {
      const weekStart = startOfWeek(selectedDate);
      const { data: schedule, error: scheduleError } = await supabase
        .from("schedules")
        .insert([
          {
            week_start_date: format(weekStart, "yyyy-MM-dd"),
            status: "draft",
            created_by: (await supabase.auth.getUser()).data.user?.id,
          },
        ])
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      // Simple algorithm: assign each employee to a shift for each day
      const assignments = [];
      let employeeIndex = 0;
      let shiftIndex = 0;

      for (let day = 0; day < 7; day++) {
        const currentDate = format(addDays(weekStart, day), "yyyy-MM-dd");

        if (employees && shifts) {
          // Rotate through employees and shifts
          assignments.push({
            schedule_id: schedule.id,
            employee_id: employees[employeeIndex].id,
            shift_id: shifts[shiftIndex].id,
            date: currentDate,
          });

          employeeIndex = (employeeIndex + 1) % employees.length;
          shiftIndex = (shiftIndex + 1) % shifts.length;
        }
      }

      const { error: assignmentError } = await supabase
        .from("schedule_assignments")
        .insert(assignments);

      if (assignmentError) throw assignmentError;

      return schedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Schedule generated successfully");
    },
    onError: (error) => {
      toast.error("Failed to generate schedule: " + error.message);
    },
  });

  const publishScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from("schedules")
        .update({ status: "published" })
        .eq("id", scheduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Schedule published successfully");
    },
    onError: (error) => {
      toast.error("Failed to publish schedule: " + error.message);
    },
  });

  const { data: schedules } = useQuery({
    queryKey: ["schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .order("week_start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
            <Button
              onClick={() => generateScheduleMutation.mutate()}
              disabled={!employees?.length || !shifts?.length}
            >
              Generate Schedule for Selected Week
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {schedules?.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-medium">
                    Week of {format(new Date(schedule.week_start_date), "PPP")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Status: {schedule.status}
                  </p>
                </div>
                {schedule.status === "draft" && (
                  <Button
                    onClick={() => publishScheduleMutation.mutate(schedule.id)}
                  >
                    Publish
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}