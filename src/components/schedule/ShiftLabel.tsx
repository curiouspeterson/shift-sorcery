import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShiftLabelProps {
  shiftType: string;
  currentStaff: number;
  minStaff: number;
  date: string;
}

export function ShiftLabel({ shiftType, currentStaff, minStaff, date }: ShiftLabelProps) {
  const queryClient = useQueryClient();
  const isMet = currentStaff >= minStaff;
  const color = isMet ? "text-green-500" : "text-red-500";

  const { data: shifts } = useQuery({
    queryKey: ['shifts-by-type', shiftType],
    queryFn: async () => {
      const startHour = getStartHourForShiftType(shiftType);
      let query = supabase
        .from('shifts')
        .select('*')
        .order('start_time');
      
      // Handle the overnight shift case specially
      if (startHour === 22) {
        query = query.or(`start_time.gte.${startHour}:00,start_time.lt.23:59`);
      } else {
        const endHour = startHour + 8;
        query = query.gte('start_time', `${startHour}:00`).lt('start_time', `${endHour}:00`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching shifts:', error);
        throw error;
      }
      return data;
    },
  });

  const addEmployeeMutation = useMutation({
    mutationFn: async () => {
      // For now, just show a toast - this will be implemented in a future update
      toast.info("This feature will be implemented soon!");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });

  function getStartHourForShiftType(type: string): number {
    switch (type) {
      case "Day Shift Early":
        return 4;
      case "Day Shift":
        return 8;
      case "Swing Shift":
        return 16;
      case "Graveyard":
        return 22;
      default:
        return 0;
    }
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      <span className={color}>
        {shiftType} ({currentStaff}/{minStaff})
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-4 w-4"
        onClick={() => addEmployeeMutation.mutate()}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}