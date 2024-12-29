import { Shift, ShiftType, CoverageRequirement } from '@/types';

export function getShiftType(startTime: string): string {
  const hour = parseInt(startTime.split(':')[0]);
  console.log(`🕒 Determining shift type for hour: ${hour}`);
  
  // Enhanced shift type determination with overlap handling
  if (hour >= 4 && hour < 8) return "Day Shift Early";
  if (hour >= 8 && hour < 16) return "Day Shift";
  if (hour >= 16 && hour < 22) return "Swing Shift";
  return "Graveyard"; // 22-4 or overnight
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function normalizeMinutes(minutes: number, referenceTime: number = 0): number {
  // Enhanced normalization that considers the reference time for proper overnight handling
  while (minutes < referenceTime) minutes += 24 * 60;
  return minutes;
}

function doesTimeRangeOverlap(
  shiftStart: number,
  shiftEnd: number,
  periodStart: number,
  periodEnd: number
): boolean {
  console.log(`\n⏰ Analyzing time overlap:
    Shift: ${Math.floor(shiftStart/60)}:${String(shiftStart%60).padStart(2, '0')} - ${Math.floor(shiftEnd/60)}:${String(shiftEnd%60).padStart(2, '0')}
    Period: ${Math.floor(periodStart/60)}:${String(periodStart%60).padStart(2, '0')} - ${Math.floor(periodEnd/60)}:${String(periodEnd%60).padStart(2, '0')}`);

  // Normalize all times relative to period start
  const normalizedShiftStart = normalizeMinutes(shiftStart, periodStart);
  const normalizedShiftEnd = normalizeMinutes(shiftEnd, normalizedShiftStart);
  const normalizedPeriodEnd = normalizeMinutes(periodEnd, periodStart);

  console.log(`Normalized times (in minutes from reference):
    Shift: ${normalizedShiftStart} - ${normalizedShiftEnd}
    Period: ${periodStart} - ${normalizedPeriodEnd}`);

  // Enhanced overlap detection
  const overlaps = (
    (normalizedShiftStart <= normalizedPeriodEnd && normalizedShiftEnd >= periodStart) ||
    (normalizedShiftStart <= periodStart && normalizedShiftEnd >= periodStart)
  );

  console.log(`${overlaps ? '✅' : '❌'} Overlap result: ${overlaps}`);
  return overlaps;
}

function doesShiftOverlapPeriod(shift: any, periodStartHour: number, periodEndHour: number): boolean {
  console.log(`\n🔍 Checking shift overlap for ${shift.name}:`);
  console.log(`Shift time: ${shift.start_time} - ${shift.end_time}`);

  const shiftStart = parseTime(shift.start_time);
  let shiftEnd = parseTime(shift.end_time);
  const periodStart = periodStartHour * 60;
  let periodEnd = periodEndHour * 60;

  // Handle overnight periods
  if (periodEndHour < periodStartHour) {
    periodEnd += 24 * 60;
    console.log('🌙 Overnight period detected');
  }

  // Handle overnight shifts
  if (shiftEnd <= shiftStart) {
    shiftEnd += 24 * 60;
    console.log('🌙 Overnight shift detected');
  }

  return doesTimeRangeOverlap(shiftStart, shiftEnd, periodStart, periodEnd);
}

export function countStaffByShiftType(assignments: any[], shiftType: string): number {
  console.log(`\n📊 Counting staff for ${shiftType}`);
  const uniqueEmployees = new Set();
  
  assignments.forEach(assignment => {
    if (!assignment.employee) {
      console.warn('⚠️ Assignment missing employee data:', assignment);
      return;
    }

    console.log(`\n👤 Analyzing ${assignment.employee.first_name} ${assignment.employee.last_name}`);
    console.log(`Shift: ${assignment.shift.start_time} - ${assignment.shift.end_time}`);
    
    let overlaps = false;
    
    // Enhanced overlap checking based on shift type
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
        // Special handling for graveyard shift that crosses midnight
        overlaps = doesShiftOverlapPeriod(assignment.shift, 22, 4);
        break;
    }
    
    if (overlaps) {
      if (uniqueEmployees.has(assignment.employee_id)) {
        console.log('⚠️ Employee already counted for this shift type');
      } else {
        uniqueEmployees.add(assignment.employee_id);
        console.log(`✅ Employee counted for ${shiftType}`);
      }
    } else {
      console.log(`❌ Employee not counted for ${shiftType}`);
    }
  });
  
  console.log(`\n📈 Final count for ${shiftType}: ${uniqueEmployees.size} unique employees`);
  console.log('🏷️ Employee IDs:', Array.from(uniqueEmployees));
  return uniqueEmployees.size;
}

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
  const compatible = getShiftType(shift.start_time) === employeePattern;
  console.log(`🔄 Shift compatibility check: ${compatible ? '✅ Compatible' : '❌ Incompatible'}`);
  return compatible;
}

export function getRequiredStaffForShiftType(requirements: CoverageRequirement[], shiftType: string): number {
  console.log(`\n🎯 Getting required staff for ${shiftType}`);
  
  let requiredStaff = 0;
  
  // Map shift types to their time ranges
  const shiftTimeRanges = {
    "Day Shift Early": { start: 4, end: 8 },
    "Day Shift": { start: 8, end: 16 },
    "Swing Shift": { start: 16, end: 22 },
    "Graveyard": { start: 22, end: 4 }
  };
  
  const timeRange = shiftTimeRanges[shiftType as keyof typeof shiftTimeRanges];
  if (!timeRange) {
    console.warn(`⚠️ Unknown shift type: ${shiftType}`);
    return 0;
  }
  
  // Find the maximum required staff during this shift's time range
  requirements.forEach(req => {
    const reqStart = parseTime(req.start_time);
    const reqEnd = parseTime(req.end_time);
    
    // Check if this requirement overlaps with the shift type's time range
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