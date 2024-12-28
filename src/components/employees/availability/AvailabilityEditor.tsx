import { Button } from "@/components/ui/button";
import { ShiftSelect } from "../ShiftSelect";
import { DAYS_OF_WEEK } from "./AvailabilityList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AvailabilityEditorProps {
  editingDay: number | null;
  selectedShiftId: string | null;
  onShiftChange: (shiftId: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export function AvailabilityEditor({
  editingDay,
  selectedShiftId,
  onShiftChange,
  onCancel,
  onSave,
}: AvailabilityEditorProps) {
  if (editingDay === null) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>
          {`Edit ${DAYS_OF_WEEK[editingDay]} Availability`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ShiftSelect
            label="Select Shift"
            value={selectedShiftId}
            onValueChange={onShiftChange}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={!selectedShiftId}>
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}