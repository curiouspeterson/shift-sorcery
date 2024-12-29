import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { AssignEmployeeDialog } from "./AssignEmployeeDialog";

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

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={colorClasses}>
          {shiftType}
        </Badge>
        <span className={`text-sm ${isUnderStaffed ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
          ({currentStaff}/{minStaff})
        </span>
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
          />
        </>
      )}
    </div>
  );
}