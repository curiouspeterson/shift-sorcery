import { Shift, ShiftType } from '@/types';

export function getShiftType(startTime: string): ShiftType {
  const hour = parseInt(startTime.split(':')[0]);
  
  if (hour >= 4 && hour < 8) return "Day Shift Early";
  if (hour >= 8 && hour < 16) return "Day Shift";
  if (hour >= 16 && hour < 22) return "Swing Shift";
  return "Graveyard";
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

  const shiftStartMins = convertToMinutes(shiftStart);
  const shiftEndMins = convertToMinutes(shiftEnd);
  const availStartMins = convertToMinutes(availStart);
  const availEndMins = convertToMinutes(availEnd);

  // Handle overnight shifts
  if (shiftEndMins <= shiftStartMins) {
    // Shift crosses midnight
    return (availEndMins <= availStartMins) || // Availability also crosses midnight
           (shiftStartMins >= availStartMins && availEndMins >= shiftStartMins) || // Start time fits
           (shiftEndMins <= availEndMins && availStartMins <= shiftEndMins); // End time fits
  }

  // Regular shift (doesn't cross midnight)
  if (availEndMins <= availStartMins) {
    // Availability crosses midnight
    return shiftStartMins >= availStartMins || shiftEndMins <= availEndMins;
  }

  return shiftStartMins >= availStartMins && shiftEndMins <= availEndMins;
}

export function calculateShiftDuration(shift: Shift): number {
  const start = new Date(`2000-01-01T${shift.start_time}`);
  let end = new Date(`2000-01-01T${shift.end_time}`);
  
  // Handle overnight shifts
  if (end <= start) {
    end = new Date(`2000-01-02T${shift.end_time}`);
  }
  
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}