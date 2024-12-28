import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { clearAuthData } from "@/utils/auth";
import { useSidebarProfile } from "./dashboard/SidebarProfile";
import { SidebarNavigation } from "./dashboard/SidebarMenu";

export function DashboardSidebar() {
  const navigate = useNavigate();
  const { profile, isLoading } = useSidebarProfile();

  const handleLogout = async () => {
    try {
      await clearAuthData();
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error: any) {
      console.error("Logout error:", error);
      // Even if there's an error, clear local auth data and redirect
      await clearAuthData();
      toast.error("Error during logout", {
        description: "You have been signed out locally"
      });
      navigate("/");
    }
  };

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
        <SidebarNavigation profile={profile} />
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