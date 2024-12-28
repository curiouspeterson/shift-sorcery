import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { EmployeeAvailabilityHeader } from "@/components/employees/EmployeeAvailabilityHeader";
import { EmployeeAvailabilityForm } from "@/components/employees/EmployeeAvailabilityForm";
import { EmployeeUpcomingShifts } from "@/components/employees/EmployeeUpcomingShifts";

export default function EmployeeAvailabilityPage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const { data: employee } = useQuery({
    queryKey: ['employee', employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', employeeId)
        .maybeSingle();

      if (error) {
        toast.error("Error fetching employee");
        return null;
      }
      if (!data) {
        toast.error("Employee not found");
        navigate('/dashboard/employees');
        return null;
      }
      return data;
    },
  });

  const { data: availability } = useQuery({
    queryKey: ['availability', employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_availability')
        .select('*')
        .eq('employee_id', employeeId);

      if (error) {
        toast.error("Error fetching availability");
        return [];
      }
      return data;
    },
  });

  const { data: schedules } = useQuery({
    queryKey: ['employee_schedules', employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_assignments')
        .select(`
          *,
          schedules (*),
          shifts (*)
        `)
        .eq('employee_id', employeeId)
        .order('date', { ascending: true })
        .gte('date', new Date().toISOString().split('T')[0])
        .limit(10);

      if (error) {
        toast.error("Error fetching schedules");
        return [];
      }
      return data;
    },
  });

  if (!employee) return null;

  return (
    <div className="p-6 space-y-6">
      <EmployeeAvailabilityHeader
        firstName={employee.first_name}
        lastName={employee.last_name}
      />

      <Tabs defaultValue="availability">
        <TabsList>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="schedule">Upcoming Shifts</TabsTrigger>
        </TabsList>

        <TabsContent value="availability">
          <EmployeeAvailabilityForm
            employeeId={employeeId || ''}
            availability={availability || []}
          />
        </TabsContent>

        <TabsContent value="schedule">
          <EmployeeUpcomingShifts schedules={schedules || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}