import { CheckCircle, XCircle } from "lucide-react";

interface ShiftLabelProps {
  shiftType: string;
  currentStaff: number;
  minStaff: number;
}

export function ShiftLabel({ shiftType, currentStaff, minStaff }: ShiftLabelProps) {
  const isMet = currentStaff >= minStaff;
  const Icon = isMet ? CheckCircle : XCircle;
  const color = isMet ? "text-green-500" : "text-red-500";
  
  return (
    <div className="flex items-center gap-1 text-sm">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className={color}>
        {shiftType} ({currentStaff}/{minStaff})
      </span>
    </div>
  );
}