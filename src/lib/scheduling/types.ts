import { ShiftType } from '@/types';

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  weekly_hours_limit: number;
  role: 'employee' | 'manager';
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  shift_type: ShiftType;
  duration_hours: number;
  max_employees?: number;
}

export interface EmployeeAvailability {
  id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface CoverageRequirement {
  id: string;
  start_time: string;
  end_time: string;
  min_employees: number;
  is_peak_period?: boolean;
  required_role?: string;
}

export interface TimeOffRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface ScheduleAssignment {
  schedule_id: string;
  employee_id: string;
  shift_id: string;
  date: string;
}

export interface SchedulingResult {
  success: boolean;
  assignments: ScheduleAssignment[];
  coverage: CoverageStatus;
  messages: string[];
}

export interface CoverageStatus {
  [key: string]: {
    required: number;
    assigned: number;
    isMet: boolean;
  };
}

export interface SchedulingContext {
  employees: Employee[];
  shifts: Shift[];
  availability: EmployeeAvailability[];
  coverageRequirements: CoverageRequirement[];
  timeOffRequests: TimeOffRequest[];
}