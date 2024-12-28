import { Shift, ShiftType, CoverageRequirement } from './types.ts';

export function getShiftType(startTime: string): ShiftType {
  const hour = parseInt(startTime.split(':')[0]);
  if (hour >= 5 && hour < 14) return 'day';
  if (hour >= 14 && hour < 22) return 'swing';
  return 'graveyard';
}

export function getShiftDuration(shift: Shift): number {
  const start = new Date(`2000-01-01T${shift.start_time}`);
  const end = new Date(`2000-01-01T${shift.end_time}`);
  if (end < start) end.setDate(end.getDate() + 1);
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