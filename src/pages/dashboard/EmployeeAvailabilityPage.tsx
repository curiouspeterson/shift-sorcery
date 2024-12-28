import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AvailabilityDayItem } from "@/components/employees/AvailabilityDayItem";
import { AvailabilityTimeSelect } from "@/components/employees/AvailabilityTimeSelect";
import { useAvailabilityMutations } from "@/hooks/useAvailabilityMutations";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function EmployeeAvailabilityPage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  const { data: employee } = useQuery({
    queryKey: ['employee', employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', employeeId)
        .maybeSingle();

      if (error) {
        toast.error("Error fetching employee");
        return null;
      }
      if (!data) {
        toast.error("Employee not found");
        navigate('/dashboard/employees');
        return null;
      }
      return data;
    },
  });

  const { data: availability } = useQuery({
    queryKey: ['availability', employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_availability')
        .select('*')
        .eq('employee_id', employeeId);

      if (error) {
        toast.error("Error fetching availability");
        return [];
      }
      return data;
    },
  });

  const { data: schedules } = useQuery({
    queryKey: ['employee_schedules', employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_assignments')
        .select(`
          *,
          schedules (*),
          shifts (*)
        `)
        .eq('employee_id', employeeId)
        .order('date', { ascending: true })
        .gte('date', new Date().toISOString().split('T')[0])
        .limit(10);

      if (error) {
        toast.error("Error fetching schedules");
        return [];
      }
      return data;
    },
  });

  const { createMutation, updateMutation, deleteMutation } = useAvailabilityMutations(employeeId || '');

  const handleAddAvailability = (dayOfWeek: number) => {
    setEditingDay(dayOfWeek);
    setStartTime("09:00");
    setEndTime("17:00");
  };

  const handleSave = () => {
    if (editingDay === null || !employeeId) return;

    const existingAvailability = availability?.find(
      (a) => a.day_of_week === editingDay
    );

    if (existingAvailability) {
      updateMutation.mutate({
        id: existingAvailability.id,
        startTime,
        endTime,
      });
    } else {
      createMutation.mutate({
        dayOfWeek: editingDay,
        startTime,
        endTime,
      });
    }
    setEditingDay(null);
  };

  if (!employee) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">
          {employee.first_name} {employee.last_name}'s Schedule
        </h1>
      </div>

      <Tabs defaultValue="availability">
        <TabsList>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="schedule">Upcoming Shifts</TabsTrigger>
        </TabsList>

        <TabsContent value="availability" className="space-y-6">
          <div className="space-y-4">
            {DAYS_OF_WEEK.map((day, index) => {
              const dayAvailability = availability?.find(
                (a) => a.day_of_week === index
              );

              return (
                <AvailabilityDayItem
                  key={index}
                  day={day}
                  dayIndex={index}
                  availability={dayAvailability}
                  onEdit={(dayIndex) => {
                    setEditingDay(dayIndex);
                    if (dayAvailability) {
                      setStartTime(dayAvailability.start_time);
                      setEndTime(dayAvailability.end_time);
                    }
                  }}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onAdd={handleAddAvailability}
                />
              );
            })}
          </div>

          {editingDay !== null && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingDay !== null ? `Edit ${DAYS_OF_WEEK[editingDay]} Availability` : 'Add Availability'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <AvailabilityTimeSelect
                      label="Start Time"
                      value={startTime}
                      onValueChange={setStartTime}
                    />
                    <AvailabilityTimeSelect
                      label="End Time"
                      value={endTime}
                      onValueChange={setEndTime}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditingDay(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>
                      Save
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schedules?.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex justify-between items-center p-4 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {format(new Date(assignment.date), 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {assignment.shifts.name}
                      </p>
                    </div>
                    <p>
                      {format(new Date(`2000-01-01T${assignment.shifts.start_time}`), 'h:mm a')} -{' '}
                      {format(new Date(`2000-01-01T${assignment.shifts.end_time}`), 'h:mm a')}
                    </p>
                  </div>
                ))}
                {(!schedules || schedules.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">
                    No upcoming shifts scheduled
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}