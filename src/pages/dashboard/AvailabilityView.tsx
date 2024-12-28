import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeAvailabilityForm } from "@/components/employees/EmployeeAvailabilityForm";

export default function AvailabilityView() {
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: availability } = useQuery({
    queryKey: ["availability", currentUser?.id],
    enabled: !!currentUser?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_availability")
        .select("*, shifts (*)")
        .eq("employee_id", currentUser?.id);

      if (error) {
        toast.error("Error fetching availability");
        return [];
      }
      return data;
    },
  });

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Manage Availability</h1>

      <Card>
        <CardHeader>
          <CardTitle>Set Your Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeAvailabilityForm
            employeeId={currentUser.id}
            availability={availability || []}
          />
        </CardContent>
      </Card>
    </div>
  );
}