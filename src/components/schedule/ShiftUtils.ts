import { Shift, ShiftType, CoverageRequirement } from './types.ts';

export function getShiftType(startTime: string): string {
  const hour = parseInt(startTime.split(':')[0]);
  
  if (hour >= 4 && hour < 8) return "Day Shift Early";
  if (hour >= 8 && hour < 16) return "Day Shift";
  if (hour >= 16 && hour < 22) return "Swing Shift";
  return "Graveyard"; // 22-4
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function normalizeMinutes(minutes: number): number {
  while (minutes < 0) minutes += 24 * 60;
  return minutes % (24 * 60);
}

function doesTimeRangeOverlap(
  shiftStart: number,
  shiftEnd: number,
  periodStart: number,
  periodEnd: number
): boolean {
  // Normalize all times to minutes since midnight
  shiftStart = normalizeMinutes(shiftStart);
  shiftEnd = normalizeMinutes(shiftEnd);
  periodStart = normalizeMinutes(periodStart);
  periodEnd = normalizeMinutes(periodEnd);

  // Handle overnight shifts
  if (shiftEnd <= shiftStart) {
    shiftEnd += 24 * 60;
  }

  // Handle overnight periods
  if (periodEnd <= periodStart) {
    periodEnd += 24 * 60;
  }

  // Check if any part of the shift overlaps with the period
  return (shiftStart < periodEnd && shiftEnd > periodStart);
}

function doesShiftOverlapPeriod(shift: any, periodStartHour: number, periodEndHour: number): boolean {
  const shiftStart = parseTime(shift.start_time);
  const shiftEnd = parseTime(shift.end_time);
  const periodStart = periodStartHour * 60;
  const periodEnd = periodEndHour * 60;

  return doesTimeRangeOverlap(shiftStart, shiftEnd, periodStart, periodEnd);
}

export function countStaffByShiftType(assignments: any[], shiftType: string): number {
  const uniqueEmployees = new Set();
  
  assignments.forEach(assignment => {
    let overlaps = false;
    
    switch(shiftType) {
      case "Day Shift Early":
        overlaps = doesShiftOverlapPeriod(assignment.shift, 4, 8);
        break;
      case "Day Shift":
        overlaps = doesShiftOverlapPeriod(assignment.shift, 8, 16);
        break;
      case "Swing Shift":
        overlaps = doesShiftOverlapPeriod(assignment.shift, 16, 22);
        break;
      case "Graveyard":
        // Check both parts of the overnight period (22-24 and 0-4)
        overlaps = doesShiftOverlapPeriod(assignment.shift, 22, 28); // 28 represents 4AM next day
        break;
    }
    
    if (overlaps) {
      uniqueEmployees.add(assignment.employee_id);
    }
  });
  
  return uniqueEmployees.size;
}

export function getRequiredStaffForShiftType(coverageRequirements: any[], shiftType: string): number {
  if (!coverageRequirements) return 0;

  const requirement = coverageRequirements.find(req => {
    const reqStartHour = parseInt(req.start_time.split(':')[0]);
    
    switch (shiftType) {
      case "Day Shift Early":
        return reqStartHour >= 4 && reqStartHour < 8;
      case "Day Shift":
        return reqStartHour >= 8 && reqStartHour < 16;
      case "Swing Shift":
        return reqStartHour >= 16 && reqStartHour < 22;
      case "Graveyard":
        return reqStartHour >= 22 || reqStartHour < 4;
      default:
        return false;
    }
  });

  return requirement?.min_employees || 0;
}

export function getShiftDuration(shift: Shift): number {
  const start = parseTime(shift.start_time);
  let end = parseTime(shift.end_time);
  
  // Handle overnight shifts
  if (end <= start) {
    end += 24 * 60;
  }
  
  return (end - start) / 60;
}

export function isShiftCompatible(
  employeePattern: ShiftType | undefined,
  shift: Shift,
  isShortShift: boolean
): boolean {
  if (!employeePattern || !isShortShift) return true;
  return getShiftType(shift.start_time) === employeePattern;
}