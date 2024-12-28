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
  onValueChange: (shiftId: string) => void;
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

  const selectedShift = shifts?.find(s => s.id === value);
  const displayValue = selectedShift 
    ? `${format(new Date(`2024-01-01T${selectedShift.start_time}`), 'h:mm a')} - ${format(new Date(`2024-01-01T${selectedShift.end_time}`), 'h:mm a')}`
    : '';

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Select value={value || ''} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a shift">
            {displayValue}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {shifts?.map((shift) => (
            <SelectItem key={shift.id} value={shift.id}>
              {format(new Date(`2024-01-01T${shift.start_time}`), 'h:mm a')} - {format(new Date(`2024-01-01T${shift.end_time}`), 'h:mm a')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}