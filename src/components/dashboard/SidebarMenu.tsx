import { useNavigate, useLocation } from "react-router-dom";
import {
  Calendar,
  Clock,
  Home,
  Settings,
  Users,
  Clock3,
  Grid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];

interface SidebarNavigationProps {
  profile: Profile | null;
}

export function SidebarNavigation({ profile }: SidebarNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();

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
        title: "Shifts",
        icon: Grid,
        path: "/dashboard/shifts",
      },
      {
        title: "Settings",
        icon: Settings,
        path: "/dashboard/settings",
      },
    ] : []),
  ];

  return (
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
  );
}