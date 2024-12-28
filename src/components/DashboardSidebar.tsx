import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Calendar,
  Clock,
  Home,
  LogOut,
  Settings,
  Users,
  Clock3,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];

export function DashboardSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          
          if (error) {
            toast.error("Error fetching profile", {
              description: error.message
            });
            return;
          }
          
          if (data) {
            setProfile(data);
          } else {
            toast.error("Profile not found", {
              description: "Please contact your administrator"
            });
          }
        }
      } catch (error: any) {
        toast.error("Error loading profile", {
          description: error.message
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error: any) {
      toast.error("Error signing out", {
        description: error.message
      });
    }
  };

  const menuItems = [
    {
      title: "Dashboard",
      icon: Home,
      path: "/dashboard",
    },
    {
      title: "Schedule",
      icon: Calendar,
      path: "/dashboard/schedule",
    },
    {
      title: "Availability",
      icon: Clock3,
      path: "/dashboard/availability",
    },
    {
      title: "Time Off",
      icon: Clock,
      path: "/dashboard/time-off",
    },
    {
      title: "Employees",
      icon: Users,
      path: "/dashboard/employees",
    },
    ...(profile?.role === 'manager' ? [
      {
        title: "Settings",
        icon: Settings,
        path: "/dashboard/settings",
      },
    ] : []),
  ];

  if (isLoading) {
    return (
      <Sidebar>
        <SidebarHeader className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">ScheduleMe</h2>
            <SidebarTrigger />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="p-4">Loading...</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">ScheduleMe</h2>
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === item.path}
              >
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigate(item.path)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}