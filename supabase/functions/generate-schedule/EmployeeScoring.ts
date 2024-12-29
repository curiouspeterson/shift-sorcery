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
    const currentHours = this.weeklyHoursTracker.getCurrentHours(employee.id);
    const hoursAfterShift = currentHours + parseFloat(shift.duration_hours);
    const targetHours = employee.weekly_hours_limit;
    
    if (hoursAfterShift <= targetHours) {
      const hoursFactor = 30 * (hoursAfterShift / targetHours);
      score += hoursFactor;
    } else {
      score -= 50;
    }

    // Factor 2: Consecutive days (0-20 points)
    const consecutiveDays = this.getConsecutiveWorkDays(employee.id, currentDate, existingAssignments);
    if (consecutiveDays >= 5) {
      score -= 20;
    } else {
      score += 20 - (consecutiveDays * 4);
    }

    // Factor 3: Shift type preference (0-30 points)
    const preferenceScore = this.getPreferenceScore(employee.id, shift.shift_type);
    score += preferenceScore;

    // Factor 4: Peak period handling (0-20 points)
    if (isPeakPeriod) {
      const peakPeriodScore = this.getPeakPeriodScore(employee, shift);
      score += peakPeriodScore;
    }

    // Factor 5: Distribution balance (0-15 points)
    const distributionScore = this.getDistributionScore(employee.id, shift.shift_type, existingAssignments);
    score += distributionScore;

    // Factor 6: Random factor (0-5 points)
    score += Math.random() * 5;

    return Math.max(0, score);
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

  private getPreferenceScore(employeeId: string, shiftType: string): number {
    // Higher score for preferred shift types
    const preferenceLevel = this.getEmployeeShiftPreference(employeeId, shiftType);
    return preferenceLevel * 10; // 0-30 points based on preference level (0-3)
  }

  private getPeakPeriodScore(employee: any, shift: any): number {
    // Prioritize experienced employees during peak periods
    const experienceScore = this.calculateExperienceScore(employee);
    return Math.min(20, experienceScore);
  }

  private getDistributionScore(employeeId: string, shiftType: string, assignments: any[]): number {
    // Calculate how many times this employee has been assigned this shift type
    const shiftTypeCount = assignments.filter(
      a => a.employee_id === employeeId && a.shift.shift_type === shiftType
    ).length;

    // Lower score if employee has been assigned this shift type frequently
    return Math.max(0, 15 - (shiftTypeCount * 3));
  }

  private calculateExperienceScore(employee: any): number {
    // This could be enhanced with actual experience data
    return 15; // Default medium experience score
  }

  private getEmployeeShiftPreference(employeeId: string, shiftType: string): number {
    // This should be replaced with actual preference data from the database
    return 2; // Default medium preference
  }
}