export function getShiftType(startTime: string): string {
  const hour = parseInt(startTime.split(':')[0]);
  
  // Handle overnight shifts properly
  if (hour >= 4 && hour < 8) return "Day Shift Early";
  if (hour >= 8 && hour < 16) return "Day Shift";
  if (hour >= 16 && hour < 22) return "Swing Shift";
  return "Graveyard"; // 22-4
}

export function countStaffByShiftType(assignments: any[], shiftType: string): number {
  return assignments.filter(a => {
    const assignmentShiftType = getShiftType(a.shift.start_time);
    console.log(`Assignment ${a.employee.first_name} shift type: ${assignmentShiftType} (${a.shift.start_time})`);
    return assignmentShiftType === shiftType;
  }).length;
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