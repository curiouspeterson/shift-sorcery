import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeOffRequestsManager } from "@/components/TimeOffRequestsManager";
import { EmployeeList } from "@/components/employees/EmployeeList";

export default function EmployeesView() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Employee Management</h1>

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
    </div>
  );
}