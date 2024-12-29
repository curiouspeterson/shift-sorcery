import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ScheduleStatusProps {
  status: string | undefined;
  onDelete: () => void;
}

export function ScheduleStatus({ status, onDelete }: ScheduleStatusProps) {
  return (
    <div className="flex items-center gap-2">
      <h3 className="text-lg font-medium">Schedule Status</h3>
      {status ? (
        <Badge variant={status === 'draft' ? 'secondary' : 'outline'}>
          {status === 'draft' ? 'Draft' : 'Published'}
        </Badge>
      ) : (
        <Badge variant="outline">No Schedule</Badge>
      )}
      {status && (
        <Button 
          onClick={onDelete} 
          variant="destructive" 
          size="icon"
          className="ml-2 h-7 w-7"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}