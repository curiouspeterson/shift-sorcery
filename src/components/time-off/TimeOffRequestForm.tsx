import { useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";

type TimeOffRequest = {
  start_date: Date;
  end_date: Date;
  reason?: string;
};

export function TimeOffRequestForm() {
  const { toast } = useToast();
  const [selectedStartDate, setSelectedStartDate] = useState<Date>();
  const [selectedEndDate, setSelectedEndDate] = useState<Date>();
  const form = useForm<TimeOffRequest>();

  const handleSubmit = async () => {
    if (!selectedStartDate || !selectedEndDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("time_off_requests").insert({
      employee_id: user.id,
      start_date: format(selectedStartDate, "yyyy-MM-dd"),
      end_date: format(selectedEndDate, "yyyy-MM-dd"),
      status: "pending",
      reason: form.getValues("reason"),
    });

    if (error) {
      toast({
        title: "Error submitting request",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Time off request submitted successfully",
    });

    form.reset();
    setSelectedStartDate(undefined);
    setSelectedEndDate(undefined);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Time Off</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <div className="border rounded-lg p-3 bg-card">
                  <Calendar
                    mode="single"
                    selected={selectedStartDate}
                    onSelect={setSelectedStartDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <div className="border rounded-lg p-3 bg-card">
                  <Calendar
                    mode="single"
                    selected={selectedEndDate}
                    onSelect={setSelectedEndDate}
                    disabled={(date) => 
                      date < new Date() || 
                      (selectedStartDate ? date < selectedStartDate : false)
                    }
                    className="rounded-md"
                  />
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit">Submit Request</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}