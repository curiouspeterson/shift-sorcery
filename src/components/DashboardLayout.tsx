import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { clearAuthData } from "@/utils/auth";
import { Loader2 } from "lucide-react";

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;

    const checkAuth = async () => {
      try {
        // First check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          console.log("No session found, redirecting to login");
          await clearAuthData();
          navigate("/");
          return;
        }

        // Verify the session is still valid
        const { error: userError } = await supabase.auth.getUser();
        if (userError) {
          throw userError;
        }

        // Check if user has a profile with retry logic
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile error:", profileError);
          if (retryCount < MAX_RETRIES) {
            setRetryCount(prev => prev + 1);
            retryTimeout = setTimeout(checkAuth, 1000 * (retryCount + 1));
            return;
          }
          throw new Error("Unable to load user profile after multiple attempts");
        }

        if (!profile) {
          console.error("No profile found for user");
          setAuthError("Profile not found. Please contact support.");
          return;
        }

        if (mounted) {
          setIsLoading(false);
          setAuthError(null);
          setRetryCount(0);
        }
      } catch (error: any) {
        console.error("Auth error:", error);
        if (mounted) {
          setAuthError(error.message);
          await clearAuthData();
          
          if (error.message === "No session found") {
            navigate("/");
          } else {
            toast.error("Authentication error", {
              description: "Please sign in again"
            });
            navigate("/");
          }
        }
      }
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        await clearAuthData();
        navigate("/");
      }
    });

    return () => {
      mounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      subscription.unsubscribe();
    };
  }, [navigate, retryCount]);

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-destructive mb-4">Error: {authError}</div>
        <button
          onClick={() => navigate("/")}
          className="text-primary hover:underline"
        >
          Return to Login
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
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