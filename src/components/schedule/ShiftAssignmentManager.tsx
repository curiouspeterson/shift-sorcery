import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignEmployeeDialog } from "./AssignEmployeeDialog";
import { Badge } from "@/components/ui/badge";
import { getShiftType } from "@/utils/shiftUtils";
import { format } from "date-fns";
import { UserPlus } from "lucide-react";

interface ShiftAssignmentManagerProps {
  shift: any;
  date: string;
  scheduleId?: string;
  assignments: any[];
}

export function ShiftAssignmentManager({
  shift,
  date,
  scheduleId,
  assignments
}: ShiftAssignmentManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const shiftType = getShiftType(shift.start_time);
  const currentAssignments = assignments.filter(a => a.shift_id === shift.id);

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-sm sm:text-base">
            <span className="block sm:inline">{shift.name}</span>
            <Badge variant="outline" className="ml-0 mt-1 sm:mt-0 sm:ml-2">
              {format(new Date(`2000-01-01T${shift.start_time}`), 'h:mm a')} - 
              {format(new Date(`2000-01-01T${shift.end_time}`), 'h:mm a')}
            </Badge>
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Employee
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {currentAssignments.map(assignment => (
            <div 
              key={assignment.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-2 bg-muted rounded-lg gap-2"
            >
              <span className="text-sm">
                {assignment.employee.first_name} {assignment.employee.last_name}
              </span>
              <Badge variant="secondary" className="self-start sm:self-auto">
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
      </CardContent>

      <AssignEmployeeDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        shiftId={shift.id}
        date={date}
        scheduleId={scheduleId}
        shiftType={shiftType}
      />
    </Card>
  );
}