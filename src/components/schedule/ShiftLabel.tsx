import { Badge } from "@/components/ui/badge";
import { getShiftType } from "@/utils/shiftTypeUtils";
import { SHIFT_CONFIGS } from "@/utils/shiftTypeUtils";

interface ShiftLabelProps {
  shiftType: string;
  currentStaff: number;
  minStaff: number;
  date: string;
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

export function ShiftLabel({ shiftType, currentStaff, minStaff, date }: ShiftLabelProps) {
  const colorClasses = getShiftColor(shiftType);
  const isUnderStaffed = currentStaff < minStaff;
  const config = SHIFT_CONFIGS[shiftType as keyof typeof SHIFT_CONFIGS];
  const requiredStaff = config?.minStaff || minStaff;

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={colorClasses}>
          {shiftType}
        </Badge>
        <span className={`text-sm ${isUnderStaffed ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
          ({currentStaff}/{requiredStaff})
        </span>
      </div>
    </div>
  );
}