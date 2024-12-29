import { ShiftType, ShiftDuration } from '@/types';

export const SHIFT_CONFIGS = {
  'Day Shift Early': {
    durations: [
      { hours: 4, start_time: '05:00', end_time: '09:00' },
      { hours: 10, start_time: '05:00', end_time: '15:00' },
      { hours: 12, start_time: '05:00', end_time: '17:00' }
    ],
    minStaff: 6
  },
  'Day Shift': {
    durations: [
      { hours: 4, start_time: '09:00', end_time: '13:00' },
      { hours: 10, start_time: '09:00', end_time: '19:00' }
    ],
    minStaff: 8
  },
  'Swing Shift': {
    durations: [
      { hours: 4, start_time: '13:00', end_time: '17:00' },
      { hours: 10, start_time: '15:00', end_time: '01:00' }
    ],
    minStaff: 7
  },
  'Graveyard': {
    durations: [
      { hours: 4, start_time: '01:00', end_time: '05:00' },
      { hours: 10, start_time: '19:00', end_time: '05:00' },
      { hours: 12, start_time: '17:00', end_time: '05:00' }
    ],
    minStaff: 6
  }
};

export function getShiftType(startTime: string): ShiftType {
  const hour = parseInt(startTime.split(':')[0]);
  
  if (hour >= 5 && hour < 9) return "Day Shift Early";
  if (hour >= 9 && hour < 13) return "Day Shift";
  if ((hour >= 13 && hour < 17) || hour === 15) return "Swing Shift";
  return "Graveyard";
}

export function getShiftTimeRange(shiftType: ShiftType) {
  const config = SHIFT_CONFIGS[shiftType];
  if (!config) return null;
  
  // Return the range of the longest duration shift for this type
  const longestShift = [...config.durations].sort((a, b) => b.hours - a.hours)[0];
  return {
    start: parseInt(longestShift.start_time.split(':')[0]),
    end: parseInt(longestShift.end_time.split(':')[0])
  };
}

export function calculateShiftHours(shift: { start_time: string; end_time: string }): number {
  const start = new Date(`2000-01-01T${shift.start_time}`);
  let end = new Date(`2000-01-01T${shift.end_time}`);
  
  // Handle overnight shifts
  if (end <= start) {
    end = new Date(`2000-01-02T${shift.end_time}`);
  }
  
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export function getShiftDuration(startTime: string, endTime: string): number {
  const start = new Date(`2000-01-01T${startTime}`);
  let end = new Date(`2000-01-01T${endTime}`);
  
  // Handle overnight shifts
  if (end <= start) {
    end = new Date(`2000-01-02T${endTime}`);
  }
  
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export function formatShiftLabel(shift: { start_time: string; end_time: string }): string {
  const duration = getShiftDuration(shift.start_time, shift.end_time);
  const type = getShiftType(shift.start_time);
  return `${type} (${duration} hours)`;
}