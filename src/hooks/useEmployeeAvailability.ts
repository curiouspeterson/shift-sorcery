import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AvailabilityData {
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export function useEmployeeAvailability(dayOfWeek: number) {
  const [availability, setAvailability] = useState<AvailabilityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error: availabilityError } = await supabase
          .from('employee_availability')
          .select('*')
          .eq('day_of_week', dayOfWeek);

        if (availabilityError) throw availabilityError;
        console.log('Found availability records:', data?.length || 0);
        
        setAvailability(data || []);
      } catch (error: any) {
        console.error('Error fetching availability:', error);
        setError(error.message);
        toast.error("Failed to load availability data");
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [dayOfWeek]);

  return { availability, loading, error };
}