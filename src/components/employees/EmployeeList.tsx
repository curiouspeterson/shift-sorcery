import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateEmployeeDialog } from "@/components/CreateEmployeeDialog";
import { useEmployeeData } from "@/hooks/useEmployeeData";
import { EmployeeCard } from "./EmployeeCard";
import { EmployeeAvailabilityDialog } from "./EmployeeAvailabilityDialog";
import { EmployeeScheduleDialog } from "./EmployeeScheduleDialog";

export function EmployeeList() {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showAvailability, setShowAvailability] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const {
    employees,
    isLoading,
    handleDeleteEmployee,
    handleSeedEmployees,
    handleSeedAvailability,
  } = useEmployeeData();

  if (isLoading) {
    return <div>Loading employees...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Employees</h2>
        <div className="space-x-2">
          <Button 
            variant="outline"
            onClick={handleSeedEmployees}
          >
            Add Test Employees
          </Button>
          <Button
            variant="outline"
            onClick={handleSeedAvailability}
          >
            Add Test Availability
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees?.map((employee) => (
          <EmployeeCard
            key={employee.id}
            employee={employee}
            onDelete={handleDeleteEmployee}
            onViewAvailability={(emp) => {
              setSelectedEmployee(emp);
              setShowAvailability(true);
            }}
            onViewSchedule={(emp) => {
              setSelectedEmployee(emp);
              setShowSchedule(true);
            }}
          />
        ))}
      </div>

      <CreateEmployeeDialog
        open={isCreating}
        onOpenChange={setIsCreating}
      />

      <EmployeeAvailabilityDialog
        employee={selectedEmployee}
        open={showAvailability}
        onOpenChange={setShowAvailability}
      />

      <EmployeeScheduleDialog
        employee={selectedEmployee}
        open={showSchedule}
        onOpenChange={setShowSchedule}
      />
    </div>
  );
}