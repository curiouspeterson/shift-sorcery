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