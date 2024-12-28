import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AvailabilityTestButtonProps {
  employeeId: string;
}

export function AvailabilityTestButton({ employeeId }: AvailabilityTestButtonProps) {
  const queryClient = useQueryClient();

  const testAvailabilityMutation = useMutation({
    mutationFn: async () => {
      const { data: shifts } = await supabase
        .from('shifts')
        .select('*')
        .order('start_time');

      if (!shifts?.length) {
        throw new Error("No shifts available");
      }

      // Delete existing availability
      const { error: deleteError } = await supabase
        .from('employee_availability')
        .delete()
        .eq('employee_id', employeeId);

      if (deleteError) throw deleteError;

      // Randomly choose between 4x10 or 3x12+4 schedule pattern
      const usesTenHourShifts = Math.random() < 0.5;
      let selectedShift;
      let startDay = Math.floor(Math.random() * 4); // Random start day (0-3)
      
      if (usesTenHourShifts) {
        // Find 10-hour shifts
        const tenHourShifts = shifts.filter(s => {
          const startHour = parseInt(s.start_time.split(':')[0]);
          const endHour = parseInt(s.end_time.split(':')[0]);
          const duration = (endHour < startHour ? endHour + 24 : endHour) - startHour;
          return duration === 10;
        });
        
        if (tenHourShifts.length === 0) throw new Error("No 10-hour shifts available");
        selectedShift = tenHourShifts[Math.floor(Math.random() * tenHourShifts.length)];
        
        // Create availability for 4 consecutive days
        const availabilityPromises = Array.from({ length: 4 }, (_, i) => {
          const dayOfWeek = (startDay + i) % 7;
          return supabase
            .from('employee_availability')
            .insert({
              employee_id: employeeId,
              day_of_week: dayOfWeek,
              shift_id: selectedShift.id,
            });
        });
        
        await Promise.all(availabilityPromises);
      } else {
        // Find 12-hour and 4-hour shifts
        const twelveHourShifts = shifts.filter(s => {
          const startHour = parseInt(s.start_time.split(':')[0]);
          const endHour = parseInt(s.end_time.split(':')[0]);
          const duration = (endHour < startHour ? endHour + 24 : endHour) - startHour;
          return duration === 12;
        });
        
        const fourHourShifts = shifts.filter(s => {
          const startHour = parseInt(s.start_time.split(':')[0]);
          const endHour = parseInt(s.end_time.split(':')[0]);
          const duration = (endHour < startHour ? endHour + 24 : endHour) - startHour;
          return duration === 4;
        });
        
        if (twelveHourShifts.length === 0 || fourHourShifts.length === 0) {
          throw new Error("Required shifts not available");
        }
        
        const selectedTwelveHourShift = twelveHourShifts[Math.floor(Math.random() * twelveHourShifts.length)];
        const selectedFourHourShift = fourHourShifts[Math.floor(Math.random() * fourHourShifts.length)];
        
        // Create availability for 3 twelve-hour shifts and 1 four-hour shift
        const availabilityPromises = [
          // Three 12-hour shifts
          ...Array.from({ length: 3 }, (_, i) => {
            const dayOfWeek = (startDay + i) % 7;
            return supabase
              .from('employee_availability')
              .insert({
                employee_id: employeeId,
                day_of_week: dayOfWeek,
                shift_id: selectedTwelveHourShift.id,
              });
          }),
          // One 4-hour shift
          supabase
            .from('employee_availability')
            .insert({
              employee_id: employeeId,
              day_of_week: (startDay + 3) % 7,
              shift_id: selectedFourHourShift.id,
            })
        ];
        
        await Promise.all(availabilityPromises);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', employeeId] });
      toast.success("Test availability created successfully");
    },
    onError: (error: any) => {
      toast.error("Error creating test availability", {
        description: error.message,
      });
    },
  });

  return (
    <Button 
      variant="outline"
      onClick={() => testAvailabilityMutation.mutate()}
      disabled={testAvailabilityMutation.isPending}
    >
      Test Availability
    </Button>
  );
}