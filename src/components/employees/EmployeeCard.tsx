import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Calendar, Clock, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EmployeeCardProps {
  employee: any;
  onDelete: (id: string) => void;
  onViewSchedule: (employee: any) => void;
}

export function EmployeeCard({
  employee,
  onDelete,
  onViewSchedule,
}: EmployeeCardProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {employee.first_name} {employee.last_name}
        </CardTitle>
        <CardDescription>
          {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/dashboard/employees/${employee.id}/availability`)}
          >
            <Clock className="mr-2 h-4 w-4" />
            View Availability
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onViewSchedule(employee)}
          >
            <Calendar className="mr-2 h-4 w-4" />
            View Schedule
          </Button>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => onDelete(employee.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Employee
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}