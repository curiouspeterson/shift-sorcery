import { AvailabilityDayItem } from "../AvailabilityDayItem";

export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface AvailabilityListProps {
  availability: any[];
  onEdit: (dayIndex: number, shift?: any) => void;
  onDelete: (id: string) => void;
  onAdd: (dayIndex: number) => void;
}

export function AvailabilityList({
  availability,
  onEdit,
  onDelete,
  onAdd,
}: AvailabilityListProps) {
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
            onEdit={(dayIndex) => onEdit(dayIndex, dayAvailability?.shifts)}
            onDelete={onDelete}
            onAdd={onAdd}
          />
        );
      })}
    </div>
  );
}