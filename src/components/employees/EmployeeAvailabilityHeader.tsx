import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EmployeeAvailabilityHeaderProps {
  firstName: string;
  lastName: string;
}

export function EmployeeAvailabilityHeader({ firstName, lastName }: EmployeeAvailabilityHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      <h1 className="text-2xl font-bold">
        {firstName} {lastName}'s Schedule
      </h1>
    </div>
  );
}