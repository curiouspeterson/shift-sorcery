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
        console.log('Checking auth session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        if (!session) {
          console.log("No session found, redirecting to login");
          if (mounted) {
            setIsLoading(false);
            await clearAuthData();
            navigate("/");
          }
          return;
        }

        // Session exists, reset states
        if (mounted) {
          console.log("Session found, proceeding to dashboard");
          setRetryCount(0);
          setAuthError(null);
          setIsLoading(false);
        }

      } catch (error: any) {
        console.error("Auth error:", error);
        if (!mounted) return;

        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying auth check (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
          setRetryCount(prev => prev + 1);
          retryTimeout = setTimeout(checkAuth, 1000 * Math.pow(2, retryCount));
          return;
        }
        
        setAuthError(error.message);
        setIsLoading(false);
        await clearAuthData();
        navigate("/");
        
        toast.error("Authentication error", {
          description: error.message
        });
      }
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-muted-foreground">
          {retryCount > 0 ? `Retrying connection (${retryCount}/${MAX_RETRIES})...` : 'Loading your dashboard...'}
        </p>
      </div>
    );
  }

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