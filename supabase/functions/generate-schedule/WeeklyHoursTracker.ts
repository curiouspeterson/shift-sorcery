export class WeeklyHoursTracker {
  private employeeWeeklyHours: Map<string, number> = new Map();
  private readonly MAX_WEEKLY_HOURS = 40;

  public wouldExceedWeeklyHours(employeeId: string, shiftHours: number): boolean {
    const currentHours = this.employeeWeeklyHours.get(employeeId) || 0;
    return (currentHours + shiftHours) > this.MAX_WEEKLY_HOURS;
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
}