export class TimeSlotManager {
  private employeesPerTimeSlot: Map<string, number> = new Map();

  public resetCounts(): void {
    this.employeesPerTimeSlot.clear();
  }

  public canAddToTimeSlots(timeSlots: string[], required: number): boolean {
    for (const slot of timeSlots) {
      const currentCount = this.employeesPerTimeSlot.get(slot) || 0;
      if (currentCount + 1 > required) {
        console.log(`❌ Cannot assign: would exceed minimum requirement (${required}) at ${slot}`);
        return false;
      }
    }
    return true;
  }

  public updateTimeSlots(timeSlots: string[], increment: boolean = true): void {
    const delta = increment ? 1 : -1;
    for (const slot of timeSlots) {
      const currentCount = this.employeesPerTimeSlot.get(slot) || 0;
      this.employeesPerTimeSlot.set(slot, currentCount + delta);
    }
  }

  public getCapacityInfo(): string {
    return Array.from(this.employeesPerTimeSlot.entries())
      .map(([slot, count]) => `${slot}: ${count}`)
      .join('\n');
  }
}