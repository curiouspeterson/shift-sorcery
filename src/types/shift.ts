export type ShiftType = 'Day Shift Early' | 'Day Shift' | 'Swing Shift' | 'Graveyard';

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  shift_type: ShiftType;
  duration_hours: number;
  max_employees?: number;
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