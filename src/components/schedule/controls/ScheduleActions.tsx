import { Button } from "@/components/ui/button";
import { CalendarClock, Check, Loader2 } from "lucide-react";

interface ScheduleActionsProps {
  status: string | undefined;
  onGenerate: () => void;
  onPublish: () => void;
  isGenerating?: boolean;
}

export function ScheduleActions({ 
  status, 
  onGenerate, 
  onPublish,
  isGenerating = false
}: ScheduleActionsProps) {
  return (
    <div className="space-x-2">
      {!status && (
        <Button 
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <CalendarClock className="mr-2 h-4 w-4" />
              Generate Schedule
            </>
          )}
        </Button>
      )}
      {status === 'draft' && (
        <Button onClick={onPublish} variant="secondary">
          <Check className="mr-2 h-4 w-4" />
          Publish Schedule
        </Button>
      )}
    </div>
  );
}