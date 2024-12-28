import { ScheduleGenerator } from "@/components/ScheduleGenerator";

export default function ScheduleView() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Schedule</h1>
      </div>
      <ScheduleGenerator />
    </div>
  );
}