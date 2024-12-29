import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

interface ScheduleStatusDisplayProps {
  status: string | undefined;
  onDelete: () => void;
}

export function ScheduleStatusDisplay({ status, onDelete }: ScheduleStatusDisplayProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Status:</span>
        {status ? (
          <Badge variant={status === 'published' ? 'default' : 'secondary'}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        ) : (
          <Badge variant="outline">Not Generated</Badge>
        )}
      </div>
      {status && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}