import { format, startOfWeek, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Shift = Database["public"]["Tables"]["shifts"]["Row"];
type CoverageRequirement = Database["public"]["Tables"]["coverage_requirements"]["Row"];

export const fetchEmployees = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("first_name");
  if (error) throw error;
  return data;
};

export const fetchShifts = async () => {
  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .order("start_time");
  if (error) throw error;
  return data;
};

export const fetchCoverageRequirements = async () => {
  const { data, error } = await supabase
    .from("coverage_requirements")
    .select("*")
    .order("start_time");
  if (error) throw error;
  return data;
};

export const fetchTimeOffRequests = async (startDate: string, endDate: string) => {
  const { data, error } = await supabase
    .from("time_off_requests")
    .select("*")
    .gte("start_date", startDate)
    .lte("end_date", endDate)
    .eq("status", "approved");
  if (error) throw error;
  return data;
};

export const fetchEmployeeAvailability = async () => {
  const { data, error } = await supabase
    .from("employee_availability")
    .select("*");
  if (error) throw error;
  return data;
};

export const createSchedule = async (weekStartDate: string, createdBy: string) => {
  const { data, error } = await supabase
    .from("schedules")
    .insert([
      {
        week_start_date: weekStartDate,
        status: "draft",
        created_by: createdBy,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const publishSchedule = async (scheduleId: string) => {
  const { error } = await supabase
    .from("schedules")
    .update({ status: "published" })
    .eq("id", scheduleId);
  if (error) throw error;
};