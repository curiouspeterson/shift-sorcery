import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import Index from "./pages/Index";
import ScheduleView from "./pages/dashboard/ScheduleView";

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
                  <Route path="/time-off" element={<div>Time Off</div>} />
                  <Route path="/employees" element={<div>Employees</div>} />
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