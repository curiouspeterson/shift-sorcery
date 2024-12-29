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

export function countStaffByShiftType(assignments: any[], shiftType: string): number {
  console.log(`\n📊 Counting staff for ${shiftType}`);
  const count = assignments.filter(assignment => 
    getShiftType(assignment.shift.start_time) === shiftType
  ).length;
  console.log(`✨ Found ${count} staff members for ${shiftType}`);
  return count;
}

export function getRequiredStaffForShiftType(requirements: any[], shiftType: string): number {
  console.log(`\n🎯 Getting required staff for ${shiftType}`);
  const timeRange = getShiftTimeRange(shiftType);
  
  if (!timeRange) {
    console.warn(`⚠️ Unknown shift type: ${shiftType}`);
    return 0;
  }
  
  let maxRequired = 0;
  requirements.forEach(req => {
    const reqStart = parseTime(req.start_time);
    const reqEnd = parseTime(req.end_time);
    const periodStart = timeRange.start * 60;
    const periodEnd = timeRange.end * 60;
    
    if (doesTimeRangeOverlap(reqStart, reqEnd, periodStart, periodEnd)) {
      maxRequired = Math.max(maxRequired, req.min_employees);
      console.log(`📋 Requirement ${req.start_time}-${req.end_time} needs ${req.min_employees} staff`);
    }
  });
  
  console.log(`✨ Final required staff for ${shiftType}: ${maxRequired}`);
  return maxRequired;
}

function getShiftTimeRange(shiftType: string) {
  const shiftTimeRanges = {
    "Day Shift Early": { start: 4, end: 8 },
    "Day Shift": { start: 8, end: 16 },
    "Swing Shift": { start: 16, end: 22 },
    "Graveyard": { start: 22, end: 4 }
  };
  
  return shiftTimeRanges[shiftType as keyof typeof shiftTimeRanges];
}

function doesTimeRangeOverlap(
  shiftStart: number,
  shiftEnd: number,
  periodStart: number,
  periodEnd: number
): boolean {
  console.log(`\n⏰ Analyzing time overlap:
    Shift: ${Math.floor(shiftStart/60)}:${String(shiftStart%60).padStart(2, '0')} - ${Math.floor(shiftEnd/60)}:${String(shiftEnd%60).padStart(2, '0')}
    Period: ${Math.floor(periodStart/60)}:${String(periodStart%60).padStart(2, '0')} - ${Math.floor(periodEnd/60)}:${String(periodEnd%60).padStart(2, '0')}`);

  // Normalize all times relative to period start
  const normalizedShiftStart = normalizeMinutes(shiftStart, periodStart);
  const normalizedShiftEnd = normalizeMinutes(shiftEnd, normalizedShiftStart);
  const normalizedPeriodEnd = normalizeMinutes(periodEnd, periodStart);

  console.log(`Normalized times (in minutes from reference):
    Shift: ${normalizedShiftStart} - ${normalizedShiftEnd}
    Period: ${periodStart} - ${normalizedPeriodEnd}`);

  const overlaps = (
    (normalizedShiftStart <= normalizedPeriodEnd && normalizedShiftEnd >= periodStart) ||
    (normalizedShiftStart <= periodStart && normalizedShiftEnd >= periodStart)
  );

  console.log(`${overlaps ? '✅' : '❌'} Overlap result: ${overlaps}`);
  return overlaps;
}

function normalizeMinutes(minutes: number, referenceTime: number = 0): number {
  while (minutes < referenceTime) minutes += 24 * 60;
  return minutes;
}

// Re-export necessary functions from other utilities
export { getShiftType } from '@/utils/shiftTypeUtils';