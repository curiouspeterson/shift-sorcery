import { Button } from "@/components/ui/button";
import { AvailabilityTimeSelect } from "../AvailabilityTimeSelect";
import { DAYS_OF_WEEK } from "./AvailabilityList";

interface AvailabilityEditorProps {
  editingDay: number | null;
  startTime: string;
  endTime: string;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export function AvailabilityEditor({
  editingDay,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onCancel,
  onSave,
}: AvailabilityEditorProps) {
  if (editingDay === null) return null;

  return (
    <div className="space-y-4 mt-4 p-4 border rounded-lg">
      <h3 className="font-medium">
        {`Edit ${DAYS_OF_WEEK[editingDay]} Availability`}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <AvailabilityTimeSelect
          label="Start Time"
          value={startTime}
          onValueChange={onStartTimeChange}
        />
        <AvailabilityTimeSelect
          label="End Time"
          value={endTime}
          onValueChange={onEndTimeChange}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave}>Save</Button>
      </div>
    </div>
  );
}