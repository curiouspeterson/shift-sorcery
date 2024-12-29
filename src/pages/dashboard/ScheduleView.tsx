import { ScheduleGenerator } from "@/components/ScheduleGenerator";
import { useQuery } from "@tanstack/react-query";
import { getEmployeeStats } from "@/utils/employeeStats";

export default function ScheduleView() {
  const { data: stats } = useQuery({
    queryKey: ['employee-stats', new Date()],
    queryFn: () => getEmployeeStats(new Date()),
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Schedule</h1>
        {stats && (
          <div className="text-sm text-muted-foreground">
            <span className="mr-4">Total Employees: {stats.totalEmployees}</span>
            <span>Employees with Shifts this Week: {stats.employeesWithShifts}</span>
          </div>
        )}
      </div>
      <ScheduleGenerator />
    </div>
  );
}