import { ShiftType } from '@/types';
import { parseTime, doesTimeRangeOverlap } from './timeUtils';
import type { CoverageRequirement } from '@/types';

export function getShiftType(startTime: string): string {
  const hour = parseInt(startTime.split(':')[0]);
  console.log(`🕒 Determining shift type for hour: ${hour}`);
  
  if (hour >= 4 && hour < 8) return "Day Shift Early";
  if (hour >= 8 && hour < 16) return "Day Shift";
  if (hour >= 16 && hour < 22) return "Swing Shift";
  return "Graveyard"; // 22-4
}

export function getShiftTimeRange(shiftType: string) {
  const shiftTimeRanges = {
    "Day Shift Early": { start: 4, end: 8 },
    "Day Shift": { start: 8, end: 16 },
    "Swing Shift": { start: 16, end: 22 },
    "Graveyard": { start: 22, end: 4 }
  };
  
  return shiftTimeRanges[shiftType as keyof typeof shiftTimeRanges];
}

export function getRequiredStaffForShiftType(requirements: CoverageRequirement[], shiftType: string): number {
  console.log(`\n🎯 Getting required staff for ${shiftType}`);
  
  let requiredStaff = 0;
  const timeRange = getShiftTimeRange(shiftType);
  
  if (!timeRange) {
    console.warn(`⚠️ Unknown shift type: ${shiftType}`);
    return 0;
  }
  
  requirements.forEach(req => {
    const reqStart = parseTime(req.start_time);
    const reqEnd = parseTime(req.end_time);
    const periodStart = timeRange.start * 60;
    const periodEnd = timeRange.end * 60;
    
    if (doesTimeRangeOverlap(reqStart, reqEnd, periodStart, periodEnd)) {
      requiredStaff = Math.max(requiredStaff, req.min_employees);
      console.log(`📋 Requirement ${req.start_time}-${req.end_time} needs ${req.min_employees} staff`);
    }
  });
  
  console.log(`✨ Final required staff for ${shiftType}: ${requiredStaff}`);
  return requiredStaff;
}