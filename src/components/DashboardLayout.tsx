import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { clearAuthData } from "@/utils/auth";

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          throw new Error("No session found");
        }

        // Verify the session is still valid
        const { error: userError } = await supabase.auth.getUser();
        if (userError) {
          throw userError;
        }
      } catch (error: any) {
        console.error("Auth error:", error);
        // Clear auth data before showing error
        await clearAuthData();
        
        // Show appropriate error message
        if (error.status === 403) {
          toast.error("Session expired", {
            description: "Please sign in again"
          });
        } else {
          toast.error("Authentication error", {
            description: "Please sign in again"
          });
        }
        
        // Always navigate to home after clearing auth
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        await clearAuthData();
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};