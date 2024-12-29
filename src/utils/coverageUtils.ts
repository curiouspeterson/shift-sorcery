import { CoverageRequirement, ShiftType } from '@/types';
import { getShiftType, getShiftTimeRange } from './shiftUtils';
import { parseTime, doesTimeRangeOverlap } from './timeUtils';

export function calculateCoverageRequirements(
  requirements: CoverageRequirement[],
  shiftType: ShiftType
): number {
  const timeRange = getShiftTimeRange(shiftType);
  if (!timeRange) return 0;

  let maxRequired = 0;
  requirements.forEach(req => {
    const reqStart = parseTime(req.start_time);
    const reqEnd = parseTime(req.end_time);
    const periodStart = timeRange.start * 60;
    const periodEnd = timeRange.end * 60;
    
    if (doesTimeRangeOverlap(reqStart, reqEnd, periodStart, periodEnd)) {
      maxRequired = Math.max(maxRequired, req.min_employees);
    }
  });

  return maxRequired;
}

export function checkCoverageStatus(
  assignments: any[],
  requirements: CoverageRequirement[]
): Record<ShiftType, { required: number; current: number; isMet: boolean }> {
  const status: Record<ShiftType, { required: number; current: number; isMet: boolean }> = {
    'Day Shift Early': { required: 0, current: 0, isMet: false },
    'Day Shift': { required: 0, current: 0, isMet: false },
    'Swing Shift': { required: 0, current: 0, isMet: false },
    'Graveyard': { required: 0, current: 0, isMet: false }
  };

  // Calculate requirements
  Object.keys(status).forEach(type => {
    status[type as ShiftType].required = calculateCoverageRequirements(
      requirements,
      type as ShiftType
    );
  });

  // Count current assignments
  assignments.forEach(assignment => {
    const type = getShiftType(assignment.shift.start_time);
    status[type].current++;
  });

  // Check if requirements are met
  Object.keys(status).forEach(type => {
    status[type as ShiftType].isMet = 
      status[type as ShiftType].current >= status[type as ShiftType].required;
  });

  return status;
}