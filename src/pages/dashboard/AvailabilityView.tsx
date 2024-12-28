import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return `${hour}:00`;
});

export default function AvailabilityView() {
  const { toast } = useToast();
  const [selectedDay, setSelectedDay] = useState(0);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  const { data: availabilities, refetch } = useQuery({
    queryKey: ["availabilities"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("employee_availability")
        .select("*")
        .eq("employee_id", user.id);

      if (error) {
        toast({
          title: "Error fetching availability",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }

      return data;
    },
  });

  const handleSaveAvailability = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existingAvailability = availabilities?.find(
      (a) => a.day_of_week === selectedDay
    );

    if (existingAvailability) {
      const { error } = await supabase
        .from("employee_availability")
        .update({
          start_time: startTime,
          end_time: endTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAvailability.id);

      if (error) {
        toast({
          title: "Error updating availability",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    } else {
      const { error } = await supabase.from("employee_availability").insert({
        employee_id: user.id,
        day_of_week: selectedDay,
        start_time: startTime,
        end_time: endTime,
      });

      if (error) {
        toast({
          title: "Error saving availability",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Availability saved",
      description: `Your availability for ${DAYS_OF_WEEK[selectedDay]} has been updated.`,
    });

    refetch();
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Manage Availability</h1>

      <Card>
        <CardHeader>
          <CardTitle>Set Your Availability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Day of Week</label>
              <Select
                value={selectedDay.toString()}
                onValueChange={(value) => setSelectedDay(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Start Time</label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Time</label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSaveAvailability}>Save Availability</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {availabilities?.map((availability) => (
              <div
                key={availability.id}
                className="flex justify-between items-center p-2 bg-muted rounded-lg"
              >
                <span className="font-medium">
                  {DAYS_OF_WEEK[availability.day_of_week]}
                </span>
                <span className="text-muted-foreground">
                  {format(new Date(`2024-01-01T${availability.start_time}`), 'h:mm a')} -{' '}
                  {format(new Date(`2024-01-01T${availability.end_time}`), 'h:mm a')}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}