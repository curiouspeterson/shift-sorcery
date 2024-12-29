import { Shift, ShiftType, CoverageRequirement } from '@/types';

export function getShiftType(startTime: string): string {
  const hour = parseInt(startTime.split(':')[0]);
  console.log(`🕒 Determining shift type for hour: ${hour}`);
  
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

  console.log(`⏰ Time range check:
    Shift: ${Math.floor(shiftStart/60)}:${String(shiftStart%60).padStart(2, '0')} - ${Math.floor(shiftEnd/60)}:${String(shiftEnd%60).padStart(2, '0')}
    Period: ${Math.floor(periodStart/60)}:${String(periodStart%60).padStart(2, '0')} - ${Math.floor(periodEnd/60)}:${String(periodEnd%60).padStart(2, '0')}
    Original shift end: ${shiftEnd <= shiftStart ? 'Next day' : 'Same day'}
    Original period end: ${periodEnd <= periodStart ? 'Next day' : 'Same day'}`);

  // Handle overnight shifts
  if (shiftEnd <= shiftStart) {
    shiftEnd += 24 * 60;
    console.log('🌙 Overnight shift detected, adjusted end time:', Math.floor(shiftEnd/60));
  }

  // Handle overnight periods
  if (periodEnd <= periodStart) {
    periodEnd += 24 * 60;
    console.log('🌙 Overnight period detected, adjusted end time:', Math.floor(periodEnd/60));
  }

  const overlaps = (shiftStart < periodEnd && shiftEnd > periodStart);
  console.log(`${overlaps ? '✅' : '❌'} Overlap result: ${overlaps}`);
  
  return overlaps;
}

function doesShiftOverlapPeriod(shift: any, periodStartHour: number, periodEndHour: number): boolean {
  console.log(`\n🔍 Checking shift overlap for ${shift.name} (${getShiftDuration(shift)} hours):`);
  console.log(`Shift time: ${shift.start_time} - ${shift.end_time}`);
  console.log(`Period: ${periodStartHour}:00 - ${periodEndHour}:00`);

  const shiftStart = parseTime(shift.start_time);
  const shiftEnd = parseTime(shift.end_time);
  const periodStart = periodStartHour * 60;
  const periodEnd = periodEndHour * 60;

  return doesTimeRangeOverlap(shiftStart, shiftEnd, periodStart, periodEnd);
}

export function countStaffByShiftType(assignments: any[], shiftType: string): number {
  console.log(`\n📊 Counting staff for ${shiftType}`);
  const uniqueEmployees = new Set();
  
  assignments.forEach(assignment => {
    console.log(`\n👤 Processing ${assignment.employee?.first_name} ${assignment.employee?.last_name}`);
    console.log(`Current shift: ${assignment.shift.start_time} - ${assignment.shift.end_time}`);
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
        overlaps = doesShiftOverlapPeriod(assignment.shift, 22, 28); // 28 represents 4AM next day
        break;
    }
    
    if (overlaps) {
      if (uniqueEmployees.has(assignment.employee_id)) {
        console.log('⚠️ Warning: Employee already counted for this shift type');
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

export function getRequiredStaffForShiftType(coverageRequirements: any[], shiftType: string): number {
  console.log(`\n🎯 Getting required staff for ${shiftType}`);
  
  if (!coverageRequirements) {
    console.log('⚠️ No coverage requirements provided');
    return 0;
  }

  const requirement = coverageRequirements.find(req => {
    const reqStartHour = parseInt(req.start_time.split(':')[0]);
    console.log(`Checking requirement starting at ${reqStartHour}:00`);
    
    let matches = false;
    switch (shiftType) {
      case "Day Shift Early":
        matches = reqStartHour >= 4 && reqStartHour < 8;
        break;
      case "Day Shift":
        matches = reqStartHour >= 8 && reqStartHour < 16;
        break;
      case "Swing Shift":
        matches = reqStartHour >= 16 && reqStartHour < 22;
        break;
      case "Graveyard":
        matches = reqStartHour >= 22 || reqStartHour < 4;
        break;
    }
    
    if (matches) {
      console.log(`✅ Found matching requirement: ${req.min_employees} employees needed`);
    }
    return matches;
  });

  const result = requirement?.min_employees || 0;
  console.log(`📊 Required staff for ${shiftType}: ${result}`);
  return result;
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