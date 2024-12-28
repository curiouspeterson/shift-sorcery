import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ShiftManagement } from "@/components/ShiftManagement";
import { ScheduleGenerator } from "@/components/ScheduleGenerator";
import type { Database } from "@/integrations/supabase/types";

type Schedule = Database["public"]["Tables"]["schedules"]["Row"];
type ScheduleAssignment = Database["public"]["Tables"]["schedule_assignments"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Shift = Database["public"]["Tables"]["shifts"]["Row"];

export default function ScheduleView() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [userRole, setUserRole] = useState<"employee" | "manager">();

  // Fetch user profile to determine role
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
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
    queryKey: ["schedule", format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const weekStart = startOfWeek(selectedDate);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const { data: schedule } = await supabase
        .from("schedules")
        .select(`
          *,
          schedule_assignments(
            *,
            employee:profiles(*),
            shift:shifts(*)
          )
        `)
        .eq("week_start_date", format(weekStart, "yyyy-MM-dd"))
        .maybeSingle();

      return schedule;
    }
  });

  if (isLoading) {
    return <div>Loading schedule...</div>;
  }

  return (
    <div className="p-6">
      <Tabs defaultValue="view" className="space-y-6">
        <TabsList>
          <TabsTrigger value="view">View Schedule</TabsTrigger>
          {userRole === "manager" && (
            <>
              <TabsTrigger value="shifts">Manage Shifts</TabsTrigger>
              <TabsTrigger value="generate">Generate Schedule</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="view" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
              <div className="mt-6 space-y-4">
                {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selectedDate), i)).map((day) => (
                  <div key={day.toISOString()} className="border-b pb-2">
                    <h3 className="font-medium">{format(day, "EEEE, MMM d")}</h3>
                    {scheduleData?.schedule_assignments
                      ?.filter(assignment => assignment.date === format(day, "yyyy-MM-dd"))
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
        </TabsContent>

        {userRole === "manager" && (
          <>
            <TabsContent value="shifts">
              <ShiftManagement />
            </TabsContent>
            <TabsContent value="generate">
              <ScheduleGenerator />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}