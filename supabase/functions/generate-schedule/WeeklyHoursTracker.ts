import { SCHEDULING_CONSTANTS } from './constants.ts';

export class WeeklyHoursTracker {
  private employeeWeeklyHours: Map<string, number> = new Map();

  public wouldExceedWeeklyHours(employeeId: string, shiftHours: number): boolean {
    const currentHours = this.employeeWeeklyHours.get(employeeId) || 0;
    return (currentHours + shiftHours) > SCHEDULING_CONSTANTS.MAX_HOURS_PER_WEEK;
  }

  public addHours(employeeId: string, hours: number): void {
    const currentHours = this.employeeWeeklyHours.get(employeeId) || 0;
    this.employeeWeeklyHours.set(employeeId, currentHours + hours);
  }

  public getCurrentHours(employeeId: string): number {
    return this.employeeWeeklyHours.get(employeeId) || 0;
  }

  public reset(): void {
    this.employeeWeeklyHours.clear();
  }

  public isUnderMinHours(employeeId: string): boolean {
    const currentHours = this.getCurrentHours(employeeId);
    return currentHours < SCHEDULING_CONSTANTS.MIN_HOURS_PER_WEEK;
  }
}