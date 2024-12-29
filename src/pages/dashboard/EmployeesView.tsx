import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeOffRequestsManager } from "@/components/TimeOffRequestsManager";
import { EmployeeList } from "@/components/employees/EmployeeList";
import { Button } from "@/components/ui/button";
import { CreateEmployeeDialog } from "@/components/CreateEmployeeDialog";
import { useState } from "react";
import { useEmployeeData } from "@/hooks/useEmployeeData";
import { UserPlus, Users, Calendar } from "lucide-react";

export default function EmployeesView() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { handleSeedEmployees, handleSeedAvailability } = useEmployeeData();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employee Management</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSeedEmployees}
          >
            <Users className="mr-2 h-4 w-4" />
            Add Test Employees
          </Button>
          <Button
            variant="outline"
            onClick={handleSeedAvailability}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Add Test Availability
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      <Tabs defaultValue="employees" className="space-y-6">
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="requests">Time Off Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <EmployeeList />
        </TabsContent>

        <TabsContent value="requests">
          <TimeOffRequestsManager />
        </TabsContent>
      </Tabs>

      <CreateEmployeeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}