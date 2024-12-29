export interface SchedulingContext {
  employees: Employee[];
  shifts: Shift[];
  availability: EmployeeAvailability[];
  coverageRequirements: CoverageRequirement[];
  timeOffRequests: TimeOffRequest[];
}

export interface SchedulingResult {
  success: boolean;
  assignments: ScheduleAssignment[];
  coverage: CoverageStatus;
  messages: string[];
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  weekly_hours_limit: number;
  role: 'employee' | 'manager';
}

export interface EmployeeAvailability {
  id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
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

export interface CoverageStatus {
  [key: string]: {
    required: number;
    assigned: number;
    isMet: boolean;
  };
}