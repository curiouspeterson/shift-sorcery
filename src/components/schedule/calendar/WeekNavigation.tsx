import { format, addDays } from "date-fns";

interface WeekNavigationProps {
  weekStart: Date;
}

export function WeekNavigation({ weekStart }: WeekNavigationProps) {
  return (
    <div className="grid grid-cols-7 gap-4 mb-6">
      {Array.from({ length: 7 }, (_, i) => {
        const day = addDays(weekStart, i);
        return (
          <div
            key={day.toISOString()}
            className="text-center text-sm font-medium"
          >
            {format(day, "EEE")}
            <br />
            {format(day, "MMM d")}
          </div>
        );
      })}
    </div>
  );
}