export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

export interface CoverageRequirement {
  start_time: string;
  end_time: string;
  min_employees: number;
}

export interface Availability {
  employee_id: string;
  day_of_week: number;
  shift_id: string;
}

export interface Assignment {
  schedule_id: string;
  employee_id: string;
  shift_id: string;
  date: string;
}

export type ShiftType = 'day' | 'swing' | 'graveyard';

export interface CoverageTracking {
  requirement: CoverageRequirement;
  currentCount: number;
  minimumMet: boolean;
}

export interface EmployeeShiftPattern {
  employeeId: string;
  shiftType: ShiftType;
  assignedCount: number;
}