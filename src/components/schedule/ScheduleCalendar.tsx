import { format, startOfWeek, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  const sortAssignmentsByShiftTime = (assignments: any[]) => {
    return [...assignments].sort((a, b) => {
      // Convert shift times to comparable values (minutes since midnight)
      const getMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const aMinutes = getMinutes(a.shift.start_time);
      const bMinutes = getMinutes(b.shift.start_time);
      
      return aMinutes - bMinutes;
    });
  };

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
                <div className="space-y-2">
                  {sortedAssignments.map((assignment: any) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between bg-muted p-2 rounded-lg"
                    >
                      <div>
                        <span className="font-medium">
                          {assignment.employee.first_name}{" "}
                          {assignment.employee.last_name}
                        </span>
                        <Badge variant="outline" className="ml-2">
                          {assignment.shift.name}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(
                          new Date(`2000-01-01T${assignment.shift.start_time}`),
                          "h:mm a"
                        )}{" "}
                        -{" "}
                        {format(
                          new Date(`2000-01-01T${assignment.shift.end_time}`),
                          "h:mm a"
                        )}
                      </span>
                    </div>
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