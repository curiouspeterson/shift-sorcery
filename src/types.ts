export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

export type ShiftType = 'Day Shift Early' | 'Day Shift' | 'Swing Shift' | 'Graveyard';

export interface CoverageRequirement {
  id: string;
  start_time: string;
  end_time: string;
  min_employees: number;
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