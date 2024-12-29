import { format } from "date-fns";

export function getShiftType(startTime: string): string {
  const hour = parseInt(startTime.split(':')[0]);
  
  if (hour >= 4 && hour < 8) return "Day Shift Early";
  if (hour >= 8 && hour < 16) return "Day Shift";
  if (hour >= 16 && hour < 22) return "Swing Shift";
  return "Graveyard"; // 22-4
}

function getShiftTimeRange(startTime: string, endTime: string): { start: number; end: number } {
  let startHour = parseInt(startTime.split(':')[0]);
  let endHour = parseInt(endTime.split(':')[0]);
  
  // Adjust end hour for overnight shifts
  if (endHour <= startHour) {
    endHour += 24;
  }
  
  return { start: startHour, end: endHour };
}

function doesShiftOverlapPeriod(startTime: string, endTime: string, periodStart: number, periodEnd: number): boolean {
  const range = getShiftTimeRange(startTime, endTime);
  
  // Handle overnight period (e.g., Graveyard 22-4)
  if (periodEnd < periodStart) {
    // Check if shift overlaps either part of the overnight period
    return (range.start >= periodStart && range.start < 24) || 
           (range.start >= 0 && range.start < periodEnd) ||
           (range.end > periodStart && range.end <= 24) ||
           (range.end > 0 && range.end <= periodEnd);
  }
  
  // For regular periods, check if shift overlaps at all
  return (range.start < periodEnd && range.end > periodStart);
}

export function countStaffByShiftType(assignments: any[], shiftType: string): number {
  const uniqueEmployees = new Set();
  
  assignments.forEach(assignment => {
    const { start_time, end_time } = assignment.shift;
    let overlaps = false;
    
    switch(shiftType) {
      case "Day Shift Early":
        overlaps = doesShiftOverlapPeriod(start_time, end_time, 4, 8);
        break;
      case "Day Shift":
        overlaps = doesShiftOverlapPeriod(start_time, end_time, 8, 16);
        break;
      case "Swing Shift":
        overlaps = doesShiftOverlapPeriod(start_time, end_time, 16, 22);
        break;
      case "Graveyard":
        overlaps = doesShiftOverlapPeriod(start_time, end_time, 22, 4);
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