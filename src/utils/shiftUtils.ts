import { Shift, ShiftType, CoverageRequirement } from '@/types';
import { parseTime, doesTimeRangeOverlap } from './timeUtils';

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

export function getShiftType(startTime: string): ShiftType {
  const hour = parseInt(startTime.split(':')[0]);
  
  if (hour >= 4 && hour < 8) return "Day Shift Early";
  if (hour >= 8 && hour < 16) return "Day Shift";
  if (hour >= 16 && hour < 22) return "Swing Shift";
  return "Graveyard";
}

export function isShiftCompatible(
  employeePattern: ShiftType | undefined,
  shift: Shift,
  isShortShift: boolean
): boolean {
  if (!employeePattern || !isShortShift) return true;
  const shiftType = getShiftType(shift.start_time);
  const compatible = shiftType === employeePattern;
  console.log(`🔄 Shift compatibility check: ${compatible ? '✅ Compatible' : '❌ Incompatible'}`);
  return compatible;
}

export function countStaffByShiftType(assignments: any[], shiftType: ShiftType): number {
  console.log(`\n📊 Counting staff for ${shiftType}`);
  const count = assignments.filter(assignment => 
    getShiftType(assignment.shift.start_time) === shiftType
  ).length;
  console.log(`✨ Found ${count} staff members for ${shiftType}`);
  return count;
}

export function getRequiredStaffForShiftType(requirements: CoverageRequirement[], shiftType: ShiftType): number {
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

export function getShiftTimeRange(shiftType: ShiftType): { start: number; end: number } | null {
  switch (shiftType) {
    case 'Day Shift Early':
      return { start: 4, end: 8 };
    case 'Day Shift':
      return { start: 8, end: 16 };
    case 'Swing Shift':
      return { start: 16, end: 22 };
    case 'Graveyard':
      return { start: 22, end: 4 };
    default:
      return null;
  }
}