import { Shift, ShiftType, CoverageRequirement } from '@/types';
import { parseTime, normalizeMinutes } from '@/utils/timeUtils';

export function getShiftType(startTime: string): ShiftType {
  const hour = parseInt(startTime.split(':')[0]);
  
  if (hour >= 4 && hour < 8) return "Day Shift Early";
  if (hour >= 8 && hour < 16) return "Day Shift";
  if (hour >= 16 && hour < 22) return "Swing Shift";
  return "Graveyard";
}

export function getShiftDuration(shift: Shift): number {
  const start = new Date(`2000-01-01T${shift.start_time}`);
  let end = new Date(`2000-01-01T${shift.end_time}`);
  
  // Handle overnight shifts
  if (end < start) {
    end = new Date(`2000-01-02T${shift.end_time}`);
  }
  
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export function shiftCoversPeriod(shift: Shift, req: CoverageRequirement): boolean {
  const shiftStart = parseTime(shift.start_time);
  const shiftEnd = parseTime(shift.end_time);
  const reqStart = parseTime(req.start_time);
  const reqEnd = parseTime(req.end_time);

  // Handle overnight shifts
  if (reqEnd < reqStart) {
    return (
      (shiftStart <= reqEnd || shiftStart >= reqStart) &&
      (shiftEnd <= reqEnd || shiftEnd >= reqStart)
    );
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

export function isTimeWithinAvailability(
  shiftStart: string,
  shiftEnd: string,
  availStart: string,
  availEnd: string
): boolean {
  const convertToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  let shiftStartMins = convertToMinutes(shiftStart);
  let shiftEndMins = convertToMinutes(shiftEnd);
  let availStartMins = convertToMinutes(availStart);
  let availEndMins = convertToMinutes(availEnd);

  // Handle overnight shifts
  shiftEndMins = normalizeMinutes(shiftEndMins, shiftStartMins);
  availEndMins = normalizeMinutes(availEndMins, availStartMins);

  // Handle overnight availability
  if (availEndMins <= availStartMins) {
    return shiftStartMins >= availStartMins || shiftEndMins <= availEndMins;
  }

  return shiftStartMins >= availStartMins && shiftEndMins <= availEndMins;
}