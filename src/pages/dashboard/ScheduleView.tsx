import { ScheduleGenerator } from "@/components/ScheduleGenerator";
import { useQuery } from "@tanstack/react-query";
import { getEmployeeStats } from "@/utils/employeeStats";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

export default function ScheduleView() {
  // Create a stable date reference
  const currentDate = useMemo(() => new Date(), []);

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['employee-stats', currentDate.toISOString().split('T')[0]],
    queryFn: () => getEmployeeStats(currentDate),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: 2
  });

  return (
    <div className="p-6">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Schedule</h1>
          <Card className="p-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : error ? (
              <div className="text-sm text-destructive">
                Error loading statistics
              </div>
            ) : (
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  Total Employees: <span className="font-medium text-foreground">{stats?.totalEmployees || 0}</span>
                </p>
                <p className="text-muted-foreground">
                  Employees with Shifts: <span className="font-medium text-foreground">{stats?.employeesWithShifts || 0}</span>
                </p>
              </div>
            )}
          </Card>
        </div>
        <ScheduleGenerator />
      </div>
    </div>
  );
}