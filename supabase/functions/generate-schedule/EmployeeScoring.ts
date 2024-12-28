import { WeeklyHoursTracker } from './WeeklyHoursTracker.ts';
import { SCHEDULING_CONSTANTS } from './constants.ts';

export class EmployeeScoring {
  constructor(private weeklyHoursTracker: WeeklyHoursTracker) {}

  public scoreEmployee(
    employee: any,
    shift: any,
    currentDate: string,
    assignments: any[]
  ): number {
    let score = 100;

    // Get current weekly hours
    const currentHours = this.weeklyHoursTracker.getCurrentHours(employee.id);
    const shiftHours = this.getShiftHours(shift);

    // Immediately disqualify if would exceed weekly hours
    if ((currentHours + shiftHours) > SCHEDULING_CONSTANTS.MAX_HOURS_PER_WEEK) {
      return 0;
    }

    // Prioritize employees who need more hours to meet minimum
    if (currentHours < SCHEDULING_CONSTANTS.MIN_HOURS_PER_WEEK) {
      score += 30;
    }

    // Check consecutive days
    const consecutiveDays = this.getConsecutiveWorkDays(employee.id, currentDate, assignments);
    if (consecutiveDays >= SCHEDULING_CONSTANTS.MAX_CONSECUTIVE_DAYS) {
      return 0;
    }

    // Penalize based on consecutive days worked
    score -= consecutiveDays * 10;

    // Bonus for employees under target hours
    const targetHours = (SCHEDULING_CONSTANTS.MIN_HOURS_PER_WEEK + SCHEDULING_CONSTANTS.MAX_HOURS_PER_WEEK) / 2;
    if (currentHours < targetHours) {
      score += 20;
    }

    return Math.max(0, score);
  }

  private getShiftHours(shift: any): number {
    const start = new Date(`2000-01-01T${shift.start_time}`);
    let end = new Date(`2000-01-01T${shift.end_time}`);
    
    if (end <= start) {
      end = new Date(`2000-01-02T${shift.end_time}`);
    }
    
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  private getConsecutiveWorkDays(
    employeeId: string,
    currentDate: string,
    assignments: any[]
  ): number {
    let consecutiveDays = 0;
    const currentDateObj = new Date(currentDate);
    
    // Count backward from current date
    for (let i = 0; i < SCHEDULING_CONSTANTS.MAX_CONSECUTIVE_DAYS; i++) {
      const checkDate = new Date(currentDateObj);
      checkDate.setDate(checkDate.getDate() - i);
      const hasShift = assignments.some(
        a => a.employee_id === employeeId && 
            a.date === checkDate.toISOString().split('T')[0]
      );
      
      if (!hasShift) break;
      consecutiveDays++;
    }
    
    return consecutiveDays;
  }
}