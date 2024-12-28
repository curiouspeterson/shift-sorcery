export class ShiftCounter {
  private shiftCounts: Record<string, number> = {
    'Day Shift Early': 0,
    'Day Shift': 0,
    'Swing Shift': 0,
    'Graveyard': 0
  };

  public reset(): void {
    this.shiftCounts = {
      'Day Shift Early': 0,
      'Day Shift': 0,
      'Swing Shift': 0,
      'Graveyard': 0
    };
  }

  public increment(shiftType: string): void {
    this.shiftCounts[shiftType]++;
  }

  public getCurrentCount(shiftType: string): number {
    return this.shiftCounts[shiftType] || 0;
  }

  public getCounts(): Record<string, number> {
    return { ...this.shiftCounts };
  }
}