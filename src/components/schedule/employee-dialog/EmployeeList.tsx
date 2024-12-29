import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  weekly_hours_limit: number;
}

interface EmployeeListProps {
  employees: Employee[];
  onAssign: (employeeId: string) => void;
  isLoading?: boolean;
}

export function EmployeeList({ employees, onAssign, isLoading = false }: EmployeeListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-4 text-center">
        No available employees found for this shift. They might be already scheduled, 
        at their weekly hour limit, or don't have availability for this shift.
      </p>
    );
  }

  return (
    <div className="space-y-2 p-2">
      {employees.map(employee => (
        <Button
          key={employee.id}
          variant="outline"
          className="w-full justify-between"
          onClick={() => onAssign(employee.id)}
        >
          <span>{employee.first_name} {employee.last_name}</span>
          <Badge variant="secondary">
            {employee.weekly_hours_limit}h limit
          </Badge>
        </Button>
      ))}
    </div>
  );
}