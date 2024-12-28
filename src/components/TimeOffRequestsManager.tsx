import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function TimeOffRequestsManager() {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["timeOffRequests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_off_requests")
        .select(`
          *,
          employee:profiles(first_name, last_name)
        `)
        .eq("status", "pending")
        .order("start_date", { ascending: true });

      if (error) {
        toast.error("Error fetching requests", {
          description: error.message,
        });
        return [];
      }
      return data;
    },
  });

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from("time_off_requests")
        .update({ status: newStatus })
        .eq("id", requestId);

      if (error) throw error;

      toast.success(`Request ${newStatus} successfully`);
      queryClient.invalidateQueries({ queryKey: ["timeOffRequests"] });
    } catch (error: any) {
      toast.error(`Error updating request: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div>Loading requests...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Off Requests</CardTitle>
        <CardDescription>
          Review and manage employee time off requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!requests || requests.length === 0 ? (
            <p className="text-muted-foreground">No pending requests</p>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  {request.employee ? (
                    <p className="font-medium">
                      {request.employee.first_name} {request.employee.last_name}
                    </p>
                  ) : (
                    <p className="font-medium text-muted-foreground">
                      Employee not found
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(request.start_date), "MMM d, yyyy")} -{" "}
                    {format(new Date(request.end_date), "MMM d, yyyy")}
                  </p>
                  {request.reason && (
                    <p className="text-sm text-muted-foreground">
                      Reason: {request.reason}
                    </p>
                  )}
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(request.id, "approved")}
                    disabled={isUpdating}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(request.id, "rejected")}
                    disabled={isUpdating}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}