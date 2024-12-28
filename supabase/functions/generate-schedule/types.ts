export interface ShiftRequirements {
  earlyShift: number;
  dayShift: number;
  swingShift: number;
  graveyardShift: number;
}

export interface ShiftAssignment {
  schedule_id: string;
  employee_id: string;
  shift_id: string;
  date: string;
}

export interface SchedulingResult {
  message: string;
  assignmentsCount: number;
}

export interface SchedulingData {
  employees: any[];
  shifts: any[];
  coverageReqs: any[];
  availability: any[];
}