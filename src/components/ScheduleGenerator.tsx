import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, addDays, parseISO, isWithinInterval } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function ScheduleGenerator() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  // Fetch employees
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

  // Fetch shifts
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

  // Fetch coverage requirements
  const { data: coverageRequirements } = useQuery({
    queryKey: ["coverage_requirements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coverage_requirements")
        .select("*")
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const generateScheduleMutation = useMutation({
    mutationFn: async () => {
      const weekStart = startOfWeek(selectedDate);
      
      // Create new schedule
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

      if (!employees || !shifts || !coverageRequirements) {
        throw new Error("Missing required data");
      }

      // Group shifts by duration
      const tenHourShifts = shifts.filter(s => {
        const start = parseISO(`2000-01-01T${s.start_time}`);
        const end = parseISO(`2000-01-01T${s.end_time}`);
        const duration = end.getTime() - start.getTime();
        return Math.abs(duration) === 10 * 60 * 60 * 1000;
      });

      const twelveHourShifts = shifts.filter(s => {
        const start = parseISO(`2000-01-01T${s.start_time}`);
        const end = parseISO(`2000-01-01T${s.end_time}`);
        const duration = end.getTime() - start.getTime();
        return Math.abs(duration) === 12 * 60 * 60 * 1000;
      });

      const fourHourShifts = shifts.filter(s => {
        const start = parseISO(`2000-01-01T${s.start_time}`);
        const end = parseISO(`2000-01-01T${s.end_time}`);
        const duration = end.getTime() - start.getTime();
        return Math.abs(duration) === 4 * 60 * 60 * 1000;
      });

      // Initialize assignments array
      const assignments = [];
      
      // Track employee hours
      const employeeHours = {};
      employees.forEach(emp => {
        employeeHours[emp.id] = 0;
      });

      // Assign employees to shifts for each day
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const currentDate = format(addDays(weekStart, dayIndex), "yyyy-MM-dd");
        
        // First, assign 12-hour shifts
        for (const shift of twelveHourShifts) {
          for (const employee of employees) {
            if (employeeHours[employee.id] <= 28 && // Ensure we don't exceed 40 hours
                !assignments.some(a => 
                  a.employee_id === employee.id && 
                  a.date === currentDate
                )) {
              assignments.push({
                schedule_id: schedule.id,
                employee_id: employee.id,
                shift_id: shift.id,
                date: currentDate,
              });
              employeeHours[employee.id] += 12;
              break;
            }
          }
        }

        // Then, assign 10-hour shifts
        for (const shift of tenHourShifts) {
          for (const employee of employees) {
            if (employeeHours[employee.id] <= 30 && // Ensure we don't exceed 40 hours
                !assignments.some(a => 
                  a.employee_id === employee.id && 
                  a.date === currentDate
                )) {
              assignments.push({
                schedule_id: schedule.id,
                employee_id: employee.id,
                shift_id: shift.id,
                date: currentDate,
              });
              employeeHours[employee.id] += 10;
              break;
            }
          }
        }

        // Finally, assign 4-hour shifts where needed
        for (const shift of fourHourShifts) {
          for (const employee of employees) {
            if (employeeHours[employee.id] <= 36 && // Ensure we don't exceed 40 hours
                !assignments.some(a => 
                  a.employee_id === employee.id && 
                  a.date === currentDate
                )) {
              assignments.push({
                schedule_id: schedule.id,
                employee_id: employee.id,
                shift_id: shift.id,
                date: currentDate,
              });
              employeeHours[employee.id] += 4;
              break;
            }
          }
        }
      }

      // Insert all assignments
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
              disabled={!employees?.length || !shifts?.length || !coverageRequirements?.length}
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