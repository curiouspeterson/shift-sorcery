import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AvailabilityTestButton } from "./AvailabilityTestButton";

interface AvailabilityDialogHeaderProps {
  firstName: string;
  lastName: string;
  employeeId: string;
}

export function AvailabilityDialogHeader({ 
  firstName, 
  lastName, 
  employeeId 
}: AvailabilityDialogHeaderProps) {
  return (
    <DialogHeader>
      <div className="flex items-center justify-between">
        <div>
          <DialogTitle>
            {firstName} {lastName}'s Availability
          </DialogTitle>
          <DialogDescription>
            Weekly availability schedule
          </DialogDescription>
        </div>
        <AvailabilityTestButton employeeId={employeeId} />
      </div>
    </DialogHeader>
  );
}