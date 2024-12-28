import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { ScheduleCalendar } from "./schedule/ScheduleCalendar";
import { ScheduleControls } from "./schedule/ScheduleControls";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function ScheduleGenerator() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUserId();
  }, []);

  const { data: scheduleData, refetch } = useQuery({
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

  const handlePreviousWeek = () => {
    setSelectedDate(subWeeks(selectedDate, 1));
  };

  const handleNextWeek = () => {
    setSelectedDate(addWeeks(selectedDate, 1));
  };

  if (!userId) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Schedule Management</CardTitle>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handlePreviousWeek}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous Week
              </Button>
              <span className="font-medium">
                Week of {format(startOfWeek(selectedDate), "MMM d, yyyy")}
              </span>
              <Button variant="outline" onClick={handleNextWeek}>
                Next Week
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScheduleControls
            selectedDate={selectedDate}
            userId={userId}
            onScheduleGenerated={refetch}
            scheduleData={scheduleData}
          />
        </CardContent>
      </Card>

      <ScheduleCalendar
        selectedDate={selectedDate}
        onDateSelect={(date) => date && setSelectedDate(date)}
        scheduleData={scheduleData}
      />
    </div>
  );
}