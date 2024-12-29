import { Button } from "@/components/ui/button";

interface ScheduleActionsProps {
  status: string | undefined;
  onGenerate: () => void;
  onPublish: () => void;
}

export function ScheduleActions({ status, onGenerate, onPublish }: ScheduleActionsProps) {
  return (
    <div className="space-x-2">
      {!status && (
        <Button onClick={onGenerate}>
          Generate Schedule
        </Button>
      )}
      {status === 'draft' && (
        <Button onClick={onPublish} variant="secondary">
          Publish Schedule
        </Button>
      )}
    </div>
  );
}