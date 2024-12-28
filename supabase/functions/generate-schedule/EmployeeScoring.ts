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

    // Penalize if employee would exceed weekly hours
    const shiftHours = this.getShiftHours(shift);
    const currentHours = this.weeklyHoursTracker.getCurrentHours(employee.id);
    if ((currentHours + shiftHours) > SCHEDULING_CONSTANTS.MAX_HOURS_PER_WEEK) {
      return 0; // Immediately disqualify
    }

    // Penalize if below minimum hours but not too much
    if (currentHours < SCHEDULING_CONSTANTS.MIN_HOURS_PER_WEEK) {
      score += 20; // Prioritize employees who need more hours
    }

    // Check consecutive days
    const consecutiveDays = this.getConsecutiveWorkDays(employee.id, currentDate, assignments);
    if (consecutiveDays >= SCHEDULING_CONSTANTS.MAX_CONSECUTIVE_DAYS) {
      return 0; // Immediately disqualify
    }

    // Penalize based on consecutive days worked
    score -= consecutiveDays * 5;

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