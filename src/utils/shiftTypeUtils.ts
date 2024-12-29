import { ShiftType } from '@/types';

export function getShiftType(startTime: string): ShiftType {
  const hour = parseInt(startTime.split(':')[0]);
  
  if (hour >= 4 && hour < 8) return "Day Shift Early";
  if (hour >= 8 && hour < 16) return "Day Shift";
  if (hour >= 16 && hour < 22) return "Swing Shift";
  return "Graveyard";
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