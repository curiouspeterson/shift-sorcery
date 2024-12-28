import { format } from "date-fns";
import { Pencil, Trash, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AvailabilityDayItemProps {
  day: string;
  dayIndex: number;
  availability?: {
    id: string;
    start_time: string;
    end_time: string;
    shifts?: {
      id: string;
      name: string;
      start_time: string;
      end_time: string;
    };
  };
  onEdit: (dayIndex: number) => void;
  onDelete: (id: string) => void;
  onAdd: (dayIndex: number) => void;
}

export function AvailabilityDayItem({
  day,
  dayIndex,
  availability,
  onEdit,
  onDelete,
  onAdd,
}: AvailabilityDayItemProps) {
  return (
    <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
      <span className="font-medium">{day}</span>
      {availability ? (
        <div className="flex items-center gap-2">
          <span>
            {format(new Date(`2024-01-01T${availability.start_time}`), 'h:mm a')} -{' '}
            {format(new Date(`2024-01-01T${availability.end_time}`), 'h:mm a')}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(dayIndex)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(availability.id)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAdd(dayIndex)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Availability
        </Button>
      )}
    </div>
  );
}