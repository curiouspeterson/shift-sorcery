import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { AssignEmployeeDialog } from "./AssignEmployeeDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CoverageRequirementTrackerProps {
  requirement: any;
  assignments: any[];
  date: string;
  scheduleId?: string;
}

export function CoverageRequirementTracker({ 
  requirement,
  assignments,
  date,
  scheduleId
}: CoverageRequirementTrackerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const shiftType = getShiftType(requirement.start_time);
  const assignedCount = assignments.filter(
    a => getShiftType(a.shift.start_time) === shiftType
  ).length;
  
  const { data: matchingShift } = useQuery({
    queryKey: ['shift-by-time', requirement.start_time, requirement.end_time],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('start_time', requirement.start_time)
        .eq('end_time', requirement.end_time)
        .maybeSingle();

      if (error) {
        console.error('Error fetching matching shift:', error);
        return null;
      }

      console.log('Found matching shift:', data);
      return data;
    }
  });

  const { data: availableEmployees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['available-employees', date, requirement.start_time, requirement.end_time],
    enabled: !!matchingShift,
    queryFn: async () => {
      const dayOfWeek = new Date(date).getDay();
      
      // First get all employees
      const { data: employees, error: employeesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employee');

      if (employeesError) {
        toast.error("Error fetching employees");
        throw employeesError;
      }

      // Then get availability for this day
      const { data: availability, error: availabilityError } = await supabase
        .from('employee_availability')
        .select('*')
        .eq('day_of_week', dayOfWeek);

      if (availabilityError) {
        toast.error("Error fetching availability");
        throw availabilityError;
      }

      // Get existing assignments for this date
      const { data: existingAssignments, error: assignmentsError } = await supabase
        .from('schedule_assignments')
        .select('employee_id')
        .eq('date', date);

      if (assignmentsError) {
        toast.error("Error fetching assignments");
        throw assignmentsError;
      }

      // Filter out already assigned employees
      const assignedEmployeeIds = new Set(existingAssignments?.map(a => a.employee_id) || []);

      // Filter employees based on availability
      const available = employees?.filter(employee => {
        // Skip if already assigned
        if (assignedEmployeeIds.has(employee.id)) return false;

        // Check if employee has availability that overlaps with the requirement
        return availability?.some(a => 
          a.employee_id === employee.id &&
          isTimeOverlapping(
            requirement.start_time,
            requirement.end_time,
            a.start_time,
            a.end_time
          )
        );
      });

      console.log(`Found ${available?.length || 0} available employees for ${requirement.start_time}-${requirement.end_time}`);
      return available || [];
    }
  });
  
  const coveragePercentage = Math.min(
    (assignedCount / requirement.min_employees) * 100,
    100
  );

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Coverage for {format(new Date(`2000-01-01T${requirement.start_time}`), 'h:mm a')} - 
            {format(new Date(`2000-01-01T${requirement.end_time}`), 'h:mm a')}
          </CardTitle>
          {matchingShift && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              disabled={isLoadingEmployees}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Employee
              {isLoadingEmployees && '...'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Progress value={coveragePercentage} />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {assignedCount} / {requirement.min_employees} employees
            </span>
            <span className={coveragePercentage === 100 ? "text-green-600" : "text-amber-600"}>
              {coveragePercentage.toFixed(0)}% coverage
            </span>
          </div>
        </div>
      </CardContent>

      {matchingShift && (
        <AssignEmployeeDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          shiftId={matchingShift.id}
          date={date}
          scheduleId={scheduleId}
          shiftType={shiftType}
          availableEmployees={availableEmployees || []}
          isLoading={isLoadingEmployees}
        />
      )}
    </Card>
  );
}

function getShiftType(startTime: string): string {
  const hour = parseInt(startTime.split(':')[0]);
  
  if (hour >= 4 && hour < 8) return "Day Shift Early";
  if (hour >= 8 && hour < 16) return "Day Shift";
  if (hour >= 16 && hour < 22) return "Swing Shift";
  return "Graveyard"; // 22-4
}

function isTimeOverlapping(
  reqStart: string,
  reqEnd: string,
  availStart: string,
  availEnd: string
): boolean {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const reqStartMins = toMinutes(reqStart);
  const reqEndMins = toMinutes(reqEnd);
  const availStartMins = toMinutes(availStart);
  const availEndMins = toMinutes(availEnd);

  // Handle overnight shifts
  if (reqEndMins <= reqStartMins) {
    return (availEndMins <= availStartMins) ||
           (reqStartMins >= availStartMins && availEndMins >= reqStartMins) ||
           (reqEndMins <= availEndMins && availStartMins <= reqEndMins);
  }

  // Handle overnight availability
  if (availEndMins <= availStartMins) {
    return reqStartMins >= availStartMins || reqEndMins <= availEndMins;
  }

  return reqStartMins >= availStartMins && reqEndMins <= availEndMins;
}