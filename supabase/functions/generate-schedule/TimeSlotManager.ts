export class TimeSlotManager {
  private timeSlots: Map<string, Set<string>> = new Map();

  addTimeSlot(date: string, employeeId: string) {
    if (!this.timeSlots.has(date)) {
      this.timeSlots.set(date, new Set());
    }
    this.timeSlots.get(date)?.add(employeeId);
  }

  isTimeSlotAvailable(date: string, employeeId: string): boolean {
    return !this.timeSlots.get(date)?.has(employeeId);
  }

  clearTimeSlots() {
    this.timeSlots.clear();
  }

  getAssignedEmployeesForDate(date: string): string[] {
    return Array.from(this.timeSlots.get(date) || []);
  }

  getTotalAssignmentsForEmployee(employeeId: string): number {
    let count = 0;
    for (const assignments of this.timeSlots.values()) {
      if (assignments.has(employeeId)) {
        count++;
      }
    }
    return count;
  }
}