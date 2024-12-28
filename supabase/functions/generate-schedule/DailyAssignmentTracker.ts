export class DailyAssignmentTracker {
  private employeesAssignedToday: Set<string> = new Set();
  private longShiftCount: number = 0;
  private readonly MAX_LONG_SHIFTS = 3;

  public isEmployeeAssignedToday(employeeId: string): boolean {
    return this.employeesAssignedToday.has(employeeId);
  }

  public canAddLongShift(): boolean {
    return this.longShiftCount < this.MAX_LONG_SHIFTS;
  }

  public addAssignment(employeeId: string, isLongShift: boolean): void {
    this.employeesAssignedToday.add(employeeId);
    if (isLongShift) {
      this.longShiftCount++;
    }
  }

  public reset(): void {
    this.employeesAssignedToday.clear();
    this.longShiftCount = 0;
  }

  public getCurrentLongShiftCount(): number {
    return this.longShiftCount;
  }
}