import { SCHEDULING_CONSTANTS } from './constants.ts';

export class ShiftTypeManager {
  public groupAndSortShiftsByPriority(shifts: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    shifts.forEach(shift => {
      const type = this.getShiftType(shift.start_time);
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(shift);
    });

    // Sort shifts by priority
    return Object.fromEntries(
      Object.entries(grouped).sort(([a], [b]) => 
        SCHEDULING_CONSTANTS.SHIFT_PRIORITY[a as keyof typeof SCHEDULING_CONSTANTS.SHIFT_PRIORITY] - 
        SCHEDULING_CONSTANTS.SHIFT_PRIORITY[b as keyof typeof SCHEDULING_CONSTANTS.SHIFT_PRIORITY]
      )
    );
  }

  private getShiftType(startTime: string): string {
    const hour = parseInt(startTime.split(':')[0]);
    if (hour >= 4 && hour < 8) return "Day Shift Early";
    if (hour >= 8 && hour < 16) return "Day Shift";
    if (hour >= 16 && hour < 22) return "Swing Shift";
    return "Graveyard";
  }
}