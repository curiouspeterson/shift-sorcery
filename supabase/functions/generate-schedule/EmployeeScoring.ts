export class EmployeeScoring {
  constructor(private weeklyHoursTracker: any) {}

  public scoreEmployee(
    employee: any,
    shift: any,
    currentDate: string,
    existingAssignments: any[]
  ): number {
    let score = 0;

    // Base score starts at 100
    score += 100;

    // Factor 1: Weekly hours balance (0-30 points)
    const currentHours = this.weeklyHoursTracker.getCurrentHours(employee.id);
    const hoursAfterShift = currentHours + parseFloat(shift.duration_hours);
    const targetHours = employee.weekly_hours_limit;
    
    if (hoursAfterShift <= targetHours) {
      // Give higher scores to assignments that bring employee closer to their target
      const hoursFactor = 30 * (hoursAfterShift / targetHours);
      score += hoursFactor;
    } else {
      // Heavily penalize going over weekly limit
      score -= 50;
    }

    // Factor 2: Consecutive days (0-20 points)
    const consecutiveDays = this.getConsecutiveWorkDays(employee.id, currentDate, existingAssignments);
    if (consecutiveDays >= 5) {
      score -= 20; // Penalize too many consecutive days
    } else {
      score += 20 - (consecutiveDays * 4); // Prefer fewer consecutive days
    }

    // Factor 3: Shift type preference if available (0-30 points)
    const hasPreference = this.hasShiftTypePreference(employee.id, shift.shift_type);
    if (hasPreference) {
      score += 30;
    }

    // Factor 4: Random factor (0-5 points) to prevent same employee always getting same score
    score += Math.random() * 5;

    return Math.max(0, score); // Ensure score is never negative
  }

  private getConsecutiveWorkDays(
    employeeId: string,
    currentDate: string,
    assignments: any[]
  ): number {
    const currentDateObj = new Date(currentDate);
    let consecutiveDays = 0;
    
    // Check previous 6 days
    for (let i = 1; i <= 6; i++) {
      const checkDate = new Date(currentDateObj);
      checkDate.setDate(checkDate.getDate() - i);
      
      const hasAssignment = assignments.some(
        assignment => 
          assignment.employee_id === employeeId && 
          assignment.date === checkDate.toISOString().split('T')[0]
      );
      
      if (hasAssignment) {
        consecutiveDays++;
      } else {
        break; // Stop counting if we find a day off
      }
    }
    
    return consecutiveDays;
  }

  private hasShiftTypePreference(employeeId: string, shiftType: string): boolean {
    // This is a placeholder - in a real implementation, you would check against
    // the shift_preferences table in the database
    return false;
  }
}