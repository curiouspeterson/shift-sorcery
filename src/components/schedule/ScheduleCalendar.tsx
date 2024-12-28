import { format, startOfWeek, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShiftLabel } from "./ShiftLabel";
import { ShiftAssignment } from "./ShiftAssignment";
import { getShiftType, countStaffByShiftType, getRequiredStaffForShiftType } from "./ShiftUtils";

interface ScheduleCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date | undefined) => void;
  scheduleData: any;
}

export function ScheduleCalendar({
  selectedDate,
  scheduleData,
}: ScheduleCalendarProps) {
  const weekStart = startOfWeek(selectedDate);

  const { data: coverageRequirements } = useQuery({
    queryKey: ['coverage-requirements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coverage_requirements')
        .select('*')
        .order('start_time');
      
      if (error) throw error;
      return data;
    }
  });

  const sortAssignmentsByShiftTime = (assignments: any[]) => {
    return [...assignments].sort((a, b) => {
      const getMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const aMinutes = getMinutes(a.shift.start_time);
      const bMinutes = getMinutes(b.shift.start_time);
      
      return aMinutes - bMinutes;
    });
  };

  const shiftTypes = ["Day Shift Early", "Day Shift", "Swing Shift", "Graveyard"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((day) => {
            const dayAssignments = scheduleData?.schedule_assignments?.filter(
              (assignment: any) =>
                assignment.date === format(day, "yyyy-MM-dd")
            ) || [];

            const sortedAssignments = sortAssignmentsByShiftTime(dayAssignments);

            return (
              <div key={day.toISOString()} className="border-b pb-4 last:border-0">
                <h3 className="font-medium mb-2">{format(day, "EEEE, MMM d")}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  {shiftTypes.map(shiftType => {
                    const currentStaff = countStaffByShiftType(dayAssignments, shiftType);
                    const minStaff = getRequiredStaffForShiftType(coverageRequirements || [], shiftType);
                    
                    return (
                      <ShiftLabel
                        key={shiftType}
                        shiftType={shiftType}
                        currentStaff={currentStaff}
                        minStaff={minStaff}
                      />
                    );
                  })}
                </div>
                <div className="space-y-2">
                  {sortedAssignments.map((assignment: any) => (
                    <ShiftAssignment
                      key={assignment.id}
                      assignment={assignment}
                    />
                  ))}
                  {(!scheduleData?.schedule_assignments ||
                    !dayAssignments.length) && (
                    <p className="text-sm text-muted-foreground">
                      No shifts scheduled
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}