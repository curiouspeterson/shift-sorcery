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

  useEffect(() => {
    let mounted = true;

    const redirectToLogin = async () => {
      console.log("No session, redirecting to login page");
      await clearAuthData();
      navigate("/");
    };

    const checkAuth = async () => {
      try {
        console.log('Checking auth session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        if (!session) {
          if (mounted) {
            setIsLoading(false);
            redirectToLogin();
          }
          return;
        }

        if (mounted) {
          console.log("Session found, proceeding to dashboard");
          setAuthError(null);
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error("Auth error:", error);
        if (!mounted) return;
        
        setAuthError(error.message);
        setIsLoading(false);
        redirectToLogin();
        
        toast.error("Authentication error", {
          description: error.message
        });
      }
    };

    // Immediate check
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      if (event === 'SIGNED_OUT' || !session) {
        redirectToLogin();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Show loading state only briefly
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your dashboard...</p>
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