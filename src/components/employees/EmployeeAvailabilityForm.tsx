import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvailabilityDayItem } from "./AvailabilityDayItem";
import { AvailabilityTimeSelect } from "./AvailabilityTimeSelect";
import { useAvailabilityMutations } from "@/hooks/useAvailabilityMutations";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface EmployeeAvailabilityFormProps {
  employeeId: string;
  availability: any[];
}

export function EmployeeAvailabilityForm({ employeeId, availability }: EmployeeAvailabilityFormProps) {
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  const { createMutation, updateMutation, deleteMutation } = useAvailabilityMutations(employeeId);

  const handleAddAvailability = (dayOfWeek: number) => {
    setEditingDay(dayOfWeek);
    setStartTime("09:00");
    setEndTime("17:00");
  };

  const handleSave = () => {
    if (editingDay === null) return;

    const existingAvailability = availability?.find(
      (a) => a.day_of_week === editingDay
    );

    if (existingAvailability) {
      updateMutation.mutate({
        id: existingAvailability.id,
        startTime,
        endTime,
      });
    } else {
      createMutation.mutate({
        dayOfWeek: editingDay,
        startTime,
        endTime,
      });
    }
    setEditingDay(null);
  };

  return (
    <div className="space-y-4">
      {DAYS_OF_WEEK.map((day, index) => {
        const dayAvailability = availability?.find(
          (a) => a.day_of_week === index
        );

        return (
          <AvailabilityDayItem
            key={index}
            day={day}
            dayIndex={index}
            availability={dayAvailability}
            onEdit={(dayIndex) => {
              setEditingDay(dayIndex);
              if (dayAvailability) {
                setStartTime(dayAvailability.start_time);
                setEndTime(dayAvailability.end_time);
              }
            }}
            onDelete={(id) => deleteMutation.mutate(id)}
            onAdd={handleAddAvailability}
          />
        );
      })}

      {editingDay !== null && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingDay !== null ? `Edit ${DAYS_OF_WEEK[editingDay]} Availability` : 'Add Availability'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <AvailabilityTimeSelect
                  label="Start Time"
                  value={startTime}
                  onValueChange={setStartTime}
                />
                <AvailabilityTimeSelect
                  label="End Time"
                  value={endTime}
                  onValueChange={setEndTime}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingDay(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}