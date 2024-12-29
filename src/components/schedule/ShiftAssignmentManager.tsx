import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignEmployeeDialog } from "./AssignEmployeeDialog";
import { Badge } from "@/components/ui/badge";
import { getShiftType } from "@/utils/shiftUtils";
import { format } from "date-fns";

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
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {shift.name}
            <Badge variant="outline" className="ml-2">
              {format(new Date(`2000-01-01T${shift.start_time}`), 'h:mm a')} - 
              {format(new Date(`2000-01-01T${shift.end_time}`), 'h:mm a')}
            </Badge>
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsDialogOpen(true)}
          >
            Assign Employee
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {currentAssignments.map(assignment => (
            <div 
              key={assignment.id}
              className="flex items-center justify-between p-2 bg-muted rounded-lg"
            >
              <span>
                {assignment.employee.first_name} {assignment.employee.last_name}
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