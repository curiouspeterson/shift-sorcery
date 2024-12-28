import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import Index from "./pages/Index";
import ScheduleView from "./pages/dashboard/ScheduleView";
import EmployeesView from "./pages/dashboard/EmployeesView";
import AvailabilityView from "./pages/dashboard/AvailabilityView";
import TimeOffView from "./pages/dashboard/TimeOffView";
import ShiftsView from "./pages/dashboard/ShiftsView";
import StatusView from "./pages/dashboard/StatusView";
import EmployeeAvailabilityPage from "./pages/dashboard/EmployeeAvailabilityPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            path="/dashboard/*"
            element={
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<ScheduleView />} />
                  <Route path="/schedule" element={<ScheduleView />} />
                  <Route path="/availability" element={<AvailabilityView />} />
                  <Route path="/time-off" element={<TimeOffView />} />
                  <Route path="/employees" element={<EmployeesView />} />
                  <Route path="/shifts" element={<ShiftsView />} />
                  <Route path="/status" element={<StatusView />} />
                  <Route path="/employees/:employeeId/availability" element={<EmployeeAvailabilityPage />} />
                  <Route path="/settings" element={<div>Settings</div>} />
                </Routes>
              </DashboardLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;