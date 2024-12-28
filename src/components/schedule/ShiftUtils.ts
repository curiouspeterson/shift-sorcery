export function getShiftType(startTime: string): string {
  const hour = parseInt(startTime.split(':')[0]);
  
  // Handle overnight shifts properly
  if (hour >= 4 && hour < 8) return "Day Shift Early";
  if (hour >= 8 && hour < 16) return "Day Shift";
  if (hour >= 16 && hour < 22) return "Swing Shift";
  return "Graveyard"; // 22-4
}

function getShiftDuration(startTime: string, endTime: string): number {
  const start = new Date(`2000-01-01T${startTime}`);
  let end = new Date(`2000-01-01T${endTime}`);
  
  // Handle overnight shifts
  if (end < start) {
    end = new Date(`2000-01-02T${endTime}`);
  }
  
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

function getTimeRangesForShift(startTime: string, endTime: string): string[] {
  const shiftTypes = [];
  const duration = getShiftDuration(startTime, endTime);
  
  // If shift is less than 10 hours, only count it for its start time
  if (duration < 10) {
    shiftTypes.push(getShiftType(startTime));
    return shiftTypes;
  }

  // For shifts 10 hours or longer, determine all periods covered
  const startHour = parseInt(startTime.split(':')[0]);
  let currentHour = startHour;
  
  // Check each 4-hour block within the shift duration
  for (let i = 0; i < Math.ceil(duration / 4); i++) {
    const timeStr = `${currentHour.toString().padStart(2, '0')}:00`;
    const shiftType = getShiftType(timeStr);
    if (!shiftTypes.includes(shiftType)) {
      shiftTypes.push(shiftType);
    }
    currentHour = (currentHour + 4) % 24;
  }
  
  return shiftTypes;
}

export function countStaffByShiftType(assignments: any[], shiftType: string): number {
  return assignments.reduce((count, assignment) => {
    const shiftTypes = getTimeRangesForShift(
      assignment.shift.start_time,
      assignment.shift.end_time
    );
    
    console.log(
      `Assignment ${assignment.employee.first_name} covers periods:`,
      shiftTypes,
      `(${assignment.shift.start_time} - ${assignment.shift.end_time})`
    );
    
    return count + (shiftTypes.includes(shiftType) ? 1 : 0);
  }, 0);
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