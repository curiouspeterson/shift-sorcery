import { format, startOfWeek, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScheduleCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date | undefined) => void;
  scheduleData: any;
}

export function ScheduleCalendar({
  selectedDate,
  onDateSelect,
  scheduleData,
}: ScheduleCalendarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          className="rounded-md border"
        />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 7 }, (_, i) =>
            addDays(startOfWeek(selectedDate), i)
          ).map((day) => (
            <div key={day.toISOString()} className="border-b pb-2">
              <h3 className="font-medium">{format(day, "EEEE, MMM d")}</h3>
              {scheduleData?.schedule_assignments
                ?.filter(
                  (assignment) =>
                    assignment.date === format(day, "yyyy-MM-dd")
                )
                .map((assignment) => (
                  <div key={assignment.id} className="ml-4 text-sm">
                    <span className="font-medium">
                      {assignment.employee.first_name}{" "}
                      {assignment.employee.last_name}
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
  );
}