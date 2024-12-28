import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek } from "date-fns";

export default function ScheduleView() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateSchedule = async () => {
    try {
      setIsGenerating(true);
      const weekStart = startOfWeek(new Date());
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke('generate-schedule', {
        body: { weekStartDate: weekStart, userId: user.id }
      });

      if (error) throw error;

      toast("Success", {
        description: "Schedule generated successfully"
      });
    } catch (error: any) {
      toast("Error generating schedule", {
        description: error.message
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <Button 
          onClick={handleGenerateSchedule} 
          disabled={isGenerating}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate Schedule"}
        </Button>
      </div>

      <div className="grid gap-4">
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Current Week</h2>
          <p className="text-muted-foreground">No shifts scheduled yet.</p>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Next Week</h2>
          <p className="text-muted-foreground">No shifts scheduled yet.</p>
        </div>
      </div>
    </div>
  );
}