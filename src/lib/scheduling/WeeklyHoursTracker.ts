export class WeeklyHoursTracker {
  private employeeHours: Map<string, number> = new Map();

  public addHours(employeeId: string, hours: number): void {
    const currentHours = this.getCurrentHours(employeeId);
    this.employeeHours.set(employeeId, currentHours + hours);
  }

  public getCurrentHours(employeeId: string): number {
    return this.employeeHours.get(employeeId) || 0;
  }

  public reset(): void {
    this.employeeHours.clear();
  }
}