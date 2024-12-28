import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EmployeeUpcomingShiftsProps {
  schedules: any[];
}

export function EmployeeUpcomingShifts({ schedules }: EmployeeUpcomingShiftsProps) {
  return (
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
  );
}