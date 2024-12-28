import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function TimeOffRequestsList() {
  const { toast } = useToast();

  const { data: timeOffRequests } = useQuery({
    queryKey: ["timeOffRequests"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("time_off_requests")
        .select("*")
        .eq("employee_id", user.id)
        .order("start_date", { ascending: false });

      if (error) {
        toast({
          title: "Error fetching time off requests",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }

      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timeOffRequests?.map((request) => (
            <div
              key={request.id}
              className="p-4 border rounded-lg space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  {format(new Date(request.start_date), "MMM d, yyyy")} -{" "}
                  {format(new Date(request.end_date), "MMM d, yyyy")}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-sm ${
                    request.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : request.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </div>
              {request.reason && (
                <p className="text-sm text-muted-foreground">
                  {request.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}