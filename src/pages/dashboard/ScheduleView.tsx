import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Schedule = Database['public']['Tables']['schedules']['Row'];
type ScheduleAssignment = Database['public']['Tables']['schedule_assignments']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Shift = Database['public']['Tables']['shifts']['Row'];

export default function ScheduleView() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [userRole, setUserRole] = useState<"employee" | "manager">();

  // Fetch user profile to determine role
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserRole(profile.role);
        }
      }
    };

    fetchUserProfile();
  }, []);

  // Fetch schedule for the selected week
  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ['schedule', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const weekStart = startOfWeek(selectedDate);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const { data: schedule } = await supabase
        .from('schedules')
        .select(`
          *,
          schedule_assignments(
            *,
            employee:profiles(*),
            shift:shifts(*)
          )
        `)
        .eq('week_start_date', format(weekStart, 'yyyy-MM-dd'))
        .maybeSingle();

      return schedule;
    }
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => 
    addDays(startOfWeek(selectedDate), i)
  );

  if (isLoading) {
    return <div>Loading schedule...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Schedule</h1>
        {userRole === 'manager' && (
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md">
            Generate Schedule
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Week</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="border-b pb-2">
                  <h3 className="font-medium">{format(day, 'EEEE, MMM d')}</h3>
                  {scheduleData?.schedule_assignments
                    ?.filter(assignment => assignment.date === format(day, 'yyyy-MM-dd'))
                    .map((assignment) => (
                      <div key={assignment.id} className="ml-4 text-sm">
                        <span className="font-medium">
                          {assignment.employee.first_name} {assignment.employee.last_name}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          {assignment.shift.start_time} - {assignment.shift.end_time}
                        </span>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}