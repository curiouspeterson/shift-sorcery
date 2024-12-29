import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { AssignEmployeeDialog } from "./AssignEmployeeDialog";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShiftLabelProps {
  shiftType: string;
  currentStaff: number;
  minStaff: number;
  date: string;
  scheduleId?: string;
  shiftId: string;
}

const getShiftColor = (shiftType: string) => {
  switch (shiftType) {
    case "Day Shift Early":
      return "bg-green-100 text-green-800 border-green-200";
    case "Day Shift":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "Swing Shift":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Graveyard":
      return "bg-pink-100 text-pink-800 border-pink-200";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function ShiftLabel({ 
  shiftType, 
  currentStaff, 
  minStaff,
  date,
  scheduleId,
  shiftId
}: ShiftLabelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const colorClasses = getShiftColor(shiftType);
  const isUnderStaffed = currentStaff < minStaff;
  const dayOfWeek = new Date(date).getDay();

  const { data: availableEmployees, isLoading } = useQuery({
    queryKey: ['available-employees', date, shiftId],
    enabled: isDialogOpen, // Only fetch when dialog is open
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

        // Get the shift details
        const { data: shift, error: shiftError } = await supabase
          .from('shifts')
          .select('*')
          .eq('id', shiftId)
          .maybeSingle();

        if (shiftError) throw shiftError;
        if (!shift) {
          console.error('Shift not found:', shiftId);
          return [];
        }

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

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={colorClasses}>
          {shiftType}
        </Badge>
        <div className="flex items-center gap-1">
          <span className={`text-sm ${isUnderStaffed ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
            ({currentStaff}/{minStaff})
          </span>
          {isUnderStaffed && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Understaffed shift</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      {scheduleId && (
        <>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <AssignEmployeeDialog
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            shiftId={shiftId}
            date={date}
            scheduleId={scheduleId}
            shiftType={shiftType}
            availableEmployees={availableEmployees || []}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
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