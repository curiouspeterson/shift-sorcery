export class EmployeeScoring {
  constructor(private weeklyHoursTracker: any) {}

  public scoreEmployee(
    employee: any,
    shift: any,
    currentDate: string,
    existingAssignments: any[],
    isPeakPeriod: boolean
  ): number {
    let score = 100;

    // Factor 1: Weekly hours balance (0-30 points)
    score += this.calculateHoursBalanceScore(employee, shift);

    // Factor 2: Consecutive days (0-20 points)
    score += this.calculateConsecutiveDaysScore(employee.id, currentDate, existingAssignments);

    // Factor 3: Shift type preference (0-30 points)
    score += this.calculatePreferenceScore(employee.id, shift.shift_type);

    // Factor 4: Peak period handling (0-20 points)
    if (isPeakPeriod) {
      score += this.calculatePeakPeriodScore(employee);
    }

    // Factor 5: Distribution balance (0-15 points)
    score += this.calculateDistributionScore(employee.id, shift.shift_type, existingAssignments);

    // Factor 6: Random factor (0-5 points) to prevent ties
    score += Math.random() * 5;

    return Math.max(0, Math.min(100, score));
  }

  private calculateHoursBalanceScore(employee: any, shift: any): number {
    const currentHours = this.weeklyHoursTracker.getCurrentHours(employee.id);
    const hoursAfterShift = currentHours + parseFloat(shift.duration_hours);
    const targetHours = employee.weekly_hours_limit;
    
    if (hoursAfterShift <= targetHours) {
      // Reward assignments that help reach target hours
      return 30 * (hoursAfterShift / targetHours);
    }
    return -50; // Significant penalty for exceeding hours limit
  }

  private calculateConsecutiveDaysScore(
    employeeId: string,
    currentDate: string,
    assignments: any[]
  ): number {
    const consecutiveDays = this.getConsecutiveWorkDays(employeeId, currentDate, assignments);
    if (consecutiveDays >= 5) {
      return -20; // Heavy penalty for too many consecutive days
    }
    return 20 - (consecutiveDays * 4); // Decreasing score for each consecutive day
  }

  private calculatePreferenceScore(employeeId: string, shiftType: string): number {
    const preferenceLevel = this.getEmployeeShiftPreference(employeeId, shiftType);
    return preferenceLevel * 10; // 0-30 points based on preference level (0-3)
  }

  private calculatePeakPeriodScore(employee: any): number {
    const experienceScore = this.calculateExperienceScore(employee);
    return Math.min(20, experienceScore);
  }

  private calculateDistributionScore(
    employeeId: string,
    shiftType: string,
    assignments: any[]
  ): number {
    const shiftTypeCount = assignments.filter(
      a => a.employee_id === employeeId && a.shift.shift_type === shiftType
    ).length;
    return Math.max(0, 15 - (shiftTypeCount * 3));
  }

  private getConsecutiveWorkDays(
    employeeId: string,
    currentDate: string,
    assignments: any[]
  ): number {
    const currentDateObj = new Date(currentDate);
    let consecutiveDays = 0;
    
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
        break;
      }
    }
    
    return consecutiveDays;
  }

  private calculateExperienceScore(employee: any): number {
    // This could be enhanced with actual experience data from the database
    // For now, using a default medium experience score
    return 15;
  }

  private getEmployeeShiftPreference(employeeId: string, shiftType: string): number {
    // This should be replaced with actual preference data from the database
    // For now, using a default medium preference
    return 2;
  }
}