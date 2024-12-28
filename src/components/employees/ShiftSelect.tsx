import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ShiftSelectProps {
  label: string;
  value: string | null;
  onValueChange: (value: string) => void;
}

export function ShiftSelect({
  label,
  value,
  onValueChange,
}: ShiftSelectProps) {
  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('start_time');

      if (error) throw error;
      return data;
    },
  });

  const formatShiftTime = (timeString: string) => {
    try {
      return format(new Date(`2024-01-01T${timeString}`), 'h:mm a');
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString;
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Select value={value || ''} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a shift" />
        </SelectTrigger>
        <SelectContent>
          {shifts?.map((shift) => (
            <SelectItem key={shift.id} value={shift.id}>
              {shift.name} ({formatShiftTime(shift.start_time)} - {formatShiftTime(shift.end_time)})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}