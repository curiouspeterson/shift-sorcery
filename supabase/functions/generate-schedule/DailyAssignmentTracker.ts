export class DailyAssignmentTracker {
  private employeesAssignedToday: Set<string> = new Set();

  public isEmployeeAssignedToday(employeeId: string): boolean {
    return this.employeesAssignedToday.has(employeeId);
  }

  public addAssignment(employeeId: string): void {
    this.employeesAssignedToday.add(employeeId);
  }

  public reset(): void {
    this.employeesAssignedToday.clear();
  }
}