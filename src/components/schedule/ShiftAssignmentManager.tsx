import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { AssignEmployeeDialog } from "./AssignEmployeeDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export function ShiftAssignmentManager({ shift, date, scheduleId, assignments }: any) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const dayOfWeek = new Date(date).getDay();

  const { data: availableEmployees, isLoading } = useQuery({
    queryKey: ['available-employees', date, shift.id],
    enabled: isDialogOpen,
    queryFn: async () => {
      try {
        // Get all employees
        const { data: employees, error: employeesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'employee');

        if (employeesError) throw employeesError;

        // Get availability for this day
        const { data: availability, error: availabilityError } = await supabase
          .from('employee_availability')
          .select('*')
          .eq('day_of_week', dayOfWeek);

        if (availabilityError) throw availabilityError;

        // Get existing assignments for this date
        const { data: existingAssignments, error: assignmentsError } = await supabase
          .from('schedule_assignments')
          .select('employee_id')
          .eq('date', date);

        if (assignmentsError) throw assignmentsError;

        // Filter out already assigned employees
        const assignedEmployeeIds = new Set(existingAssignments?.map(a => a.employee_id) || []);

        // Filter employees based on availability
        const available = employees?.filter(employee => {
          // Skip if already assigned
          if (assignedEmployeeIds.has(employee.id)) return false;

          // Check if employee has availability that overlaps with the shift
          return availability?.some(a => 
            a.employee_id === employee.id &&
            isTimeOverlapping(
              shift.start_time,
              shift.end_time,
              a.start_time,
              a.end_time
            )
          );
        });

        console.log(`Found ${available?.length || 0} available employees for shift ${shift.name}`);
        return available || [];
      } catch (error) {
        console.error('Error fetching available employees:', error);
        toast.error('Failed to fetch available employees');
        throw error;
      }
    }
  });

  const currentAssignments = assignments.filter(
    (a: any) => a.shift_id === shift.id
  );

  const formatTime = (timeStr: string) => {
    try {
      return format(new Date(`2000-01-01T${timeStr}`), 'h:mm a');
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeStr;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {shift.name} ({formatTime(shift.start_time)} - {formatTime(shift.end_time)})
            </span>
            <Badge variant="secondary" className="ml-2">
              ({currentAssignments.length} assigned)
            </Badge>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsDialogOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign
          </Button>
        </div>

        <div className="space-y-2">
          {currentAssignments.map((assignment: any) => (
            <div 
              key={assignment.id}
              className="flex items-center justify-between p-2 bg-muted rounded-lg"
            >
              <span className="text-sm">
                {assignment.employee?.first_name} {assignment.employee?.last_name}
              </span>
              <Badge variant="secondary">
                {assignment.acknowledged ? "Acknowledged" : "Pending"}
              </Badge>
            </div>
          ))}
          {currentAssignments.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No employees assigned to this shift
            </p>
          )}
        </div>

        <AssignEmployeeDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          shiftId={shift.id}
          date={date}
          scheduleId={scheduleId}
          shiftType={shift.shift_type}
          availableEmployees={availableEmployees || []}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}

// Helper function to check if times overlap
function isTimeOverlapping(
  shiftStart: string,
  shiftEnd: string,
  availStart: string,
  availEnd: string
): boolean {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const shiftStartMins = toMinutes(shiftStart);
  const shiftEndMins = toMinutes(shiftEnd);
  const availStartMins = toMinutes(availStart);
  const availEndMins = toMinutes(availEnd);

  // Handle overnight shifts
  if (shiftEndMins <= shiftStartMins) {
    return (availEndMins <= availStartMins) || // Availability also crosses midnight
           (shiftStartMins >= availStartMins && availEndMins >= shiftStartMins) || // Start time fits
           (shiftEndMins <= availEndMins && availStartMins <= shiftEndMins); // End time fits
  }

  // Regular shift (doesn't cross midnight)
  if (availEndMins <= availStartMins) {
    // Availability crosses midnight
    return shiftStartMins >= availStartMins || shiftEndMins <= availEndMins;
  }

  return shiftStartMins >= availStartMins && shiftEndMins <= availEndMins;
}
