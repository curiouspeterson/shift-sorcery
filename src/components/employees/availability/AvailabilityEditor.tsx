import { Button } from "@/components/ui/button";
import { ShiftSelect } from "../ShiftSelect";
import { DAYS_OF_WEEK } from "./AvailabilityList";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    <div className="space-y-4 mt-4 p-4 border rounded-lg">
      <h3 className="font-medium">
        {`Edit ${DAYS_OF_WEEK[editingDay]} Availability`}
      </h3>
      <div className="space-y-4">
        <ShiftSelect
          label="Select Shift"
          value={selectedShiftId}
          onValueChange={onShiftChange}
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