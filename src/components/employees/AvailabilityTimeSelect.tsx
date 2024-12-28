import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return `${hour}:00`;
});

interface AvailabilityTimeSelectProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
}

export function AvailabilityTimeSelect({
  label,
  value,
  onValueChange,
}: AvailabilityTimeSelectProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_SLOTS.map((time) => (
            <SelectItem key={time} value={time}>
              {format(new Date(`2024-01-01T${time}`), 'h:mm a')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}