import { SCHEDULING_CONSTANTS } from './constants.ts';

export class ShiftTypeManager {
  public groupAndSortShiftsByPriority(shifts: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    shifts.forEach(shift => {
      const type = this.getShiftTypeForTime(shift.start_time);
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(shift);
    });

    return Object.fromEntries(
      Object.entries(grouped).sort(([a], [b]) => 
        SCHEDULING_CONSTANTS.SHIFT_PRIORITY[a as keyof typeof SCHEDULING_CONSTANTS.SHIFT_PRIORITY] - 
        SCHEDULING_CONSTANTS.SHIFT_PRIORITY[b as keyof typeof SCHEDULING_CONSTANTS.SHIFT_PRIORITY]
      )
    );
  }

  public getShiftTypeForTime(time: string): string {
    const hour = parseInt(time.split(':')[0]);
    
    if (hour >= 4 && hour < 8) return "Day Shift Early";
    if (hour >= 8 && hour < 16) return "Day Shift";
    if (hour >= 16 && hour < 22) return "Swing Shift";
    return "Graveyard";
  }

  public isShiftDuringPeakHours(startTime: string, endTime: string): boolean {
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    
    // Define peak hours (e.g., 9 AM to 5 PM)
    const peakStart = 9 * 60; // 9 AM in minutes
    const peakEnd = 17 * 60; // 5 PM in minutes
    
    return (start <= peakEnd && end >= peakStart);
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}