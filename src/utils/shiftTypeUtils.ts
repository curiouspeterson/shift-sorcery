import { ShiftType } from '@/types';

export function getShiftType(startTime: string): string {
  const hour = parseInt(startTime.split(':')[0]);
  console.log(`🕒 Determining shift type for hour: ${hour}`);
  
  if (hour >= 4 && hour < 8) return "Day Shift Early";
  if (hour >= 8 && hour < 16) return "Day Shift";
  if (hour >= 16 && hour < 22) return "Swing Shift";
  return "Graveyard"; // 22-4 (10 PM to 6 AM)
}

export function getShiftTimeRange(shiftType: string) {
  const shiftTimeRanges = {
    "Day Shift Early": { start: 4, end: 8 },
    "Day Shift": { start: 8, end: 16 },
    "Swing Shift": { start: 16, end: 22 },
    "Graveyard": { start: 22, end: 6 } // Updated to end at 6 AM
  };
  
  return shiftTimeRanges[shiftType as keyof typeof shiftTimeRanges];
}