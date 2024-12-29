export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  shift_type: ShiftType;
  duration_hours: number;
  max_employees?: number;
}

export type ShiftType = 'Day Shift Early' | 'Day Shift' | 'Swing Shift' | 'Graveyard';

export interface CoverageRequirement {
  id: string;
  start_time: string;
  end_time: string;
  min_employees: number;
  is_peak_period?: boolean;
  required_role?: string;
}

export interface ShiftDuration {
  hours: number;
  start_time: string;
  end_time: string;
}

export interface ShiftTypeConfig {
  type: ShiftType;
  durations: ShiftDuration[];
  minStaff: number;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  weekly_hours_limit: number;
  role: 'employee' | 'manager';
}

export interface ScheduleAssignment {
  schedule_id: string;
  employee_id: string;
  shift_id: string;
  date: string;
}

export interface CoverageStatus {
  [key: string]: {
    required: number;
    assigned: number;
    isMet: boolean;
  };
}

export interface SchedulingResult {
  success: boolean;
  assignments: ScheduleAssignment[];
  coverage: CoverageStatus;
  messages: string[];
}

export interface EmployeeAvailability {
  id: string;
  employee_id: string;
  day_of_week: number;
  shift_id: string;
}