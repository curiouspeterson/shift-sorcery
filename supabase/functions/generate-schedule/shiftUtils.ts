import { Shift, ShiftType, CoverageRequirement } from './types.ts';

export function getShiftType(startTime: string): string {
  const hour = parseInt(startTime.split(':')[0]);
  
  if (hour >= 4 && hour < 8) return "Day Shift Early";
  if (hour >= 8 && hour < 16) return "Day Shift";
  if (hour >= 16 && hour < 22) return "Swing Shift";
  return "Graveyard"; // 22-4
}

export function getShiftDuration(shift: Shift): number {
  const start = new Date(`2000-01-01T${shift.start_time}`);
  let end = new Date(`2000-01-01T${shift.end_time}`);
  
  if (end < start) {
    end = new Date(`2000-01-02T${shift.end_time}`);
  }
  
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export function shiftCoversPeriod(shift: Shift, req: CoverageRequirement): boolean {
  const shiftStart = new Date(`2000-01-01T${shift.start_time}`).getTime();
  const shiftEnd = new Date(`2000-01-01T${shift.end_time}`).getTime();
  const reqStart = new Date(`2000-01-01T${req.start_time}`).getTime();
  const reqEnd = new Date(`2000-01-01T${req.end_time}`).getTime();

  // Handle overnight shifts
  if (reqEnd < reqStart) {
    return (shiftStart <= reqEnd || shiftStart >= reqStart) &&
           (shiftEnd <= reqEnd || shiftEnd >= reqStart);
  }

  return shiftStart <= reqEnd && shiftEnd >= reqStart;
}

export function isShiftCompatible(
  employeePattern: ShiftType | undefined,
  shift: Shift,
  isShortShift: boolean
): boolean {
  if (!employeePattern || !isShortShift) return true;
  return getShiftType(shift.start_time) === employeePattern;
}