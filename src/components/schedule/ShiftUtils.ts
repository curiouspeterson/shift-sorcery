import { Shift, ShiftType } from '@/types';
import { getShiftType } from '@/utils/shiftTypeUtils';
import { parseTime } from '@/utils/timeUtils';

export function getShiftDuration(shift: Shift): number {
  const start = parseTime(shift.start_time);
  let end = parseTime(shift.end_time);
  
  // Handle overnight shifts
  if (end <= start) {
    end += 24 * 60;
  }
  
  const duration = (end - start) / 60;
  console.log(`⏱️ Shift duration: ${duration} hours`);
  return duration;
}

export function isShiftCompatible(
  employeePattern: ShiftType | undefined,
  shift: Shift,
  isShortShift: boolean
): boolean {
  if (!employeePattern || !isShortShift) return true;
  const compatible = getShiftType(shift.start_time) === employeePattern;
  console.log(`🔄 Shift compatibility check: ${compatible ? '✅ Compatible' : '❌ Incompatible'}`);
  return compatible;
}

// Re-export necessary functions from other utilities
export { getShiftType } from '@/utils/shiftTypeUtils';
export { getRequiredStaffForShiftType } from '@/utils/shiftTypeUtils';