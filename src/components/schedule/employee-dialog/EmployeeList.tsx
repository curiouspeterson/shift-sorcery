import { Button } from "@/components/ui/button";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface EmployeeListProps {
  employees: Employee[];
  onAssign: (employeeId: string) => void;
}

export function EmployeeList({ employees, onAssign }: EmployeeListProps) {
  if (employees.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-2">
        No available employees found for this shift. They might be already scheduled, at their weekly hour limit, or don't have availability for this shift.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {employees.map(employee => (
        <Button
          key={employee.id}
          variant="outline"
          className="w-full justify-start"
          onClick={() => onAssign(employee.id)}
        >
          {employee.first_name} {employee.last_name}
        </Button>
      ))}
    </div>
  );
}