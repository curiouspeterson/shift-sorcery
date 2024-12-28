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
