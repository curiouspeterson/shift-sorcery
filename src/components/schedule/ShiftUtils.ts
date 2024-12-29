import { Shift, ShiftType, CoverageRequirement } from '@/types';
import { parseTime, doesTimeRangeOverlap } from '@/utils/timeUtils';
import { getShiftType as getShiftTypeUtil, getShiftTimeRange } from '@/utils/shiftTypeUtils';

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
  const shiftType = getShiftTypeUtil(shift.start_time);
  const compatible = shiftType === employeePattern;
  console.log(`🔄 Shift compatibility check: ${compatible ? '✅ Compatible' : '❌ Incompatible'}`);
  return compatible;
}

export function countStaffByShiftType(assignments: any[], shiftType: ShiftType): number {
  console.log(`\n📊 Counting staff for ${shiftType}`);
  const count = assignments.filter(assignment => 
    getShiftTypeUtil(assignment.shift.start_time) === shiftType
  ).length;
  console.log(`✨ Found ${count} staff members for ${shiftType}`);
  return count;
}

export function getRequiredStaffForShiftType(requirements: any[], shiftType: ShiftType): number {
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

// Re-export necessary functions
export { getShiftTypeUtil as getShiftType };