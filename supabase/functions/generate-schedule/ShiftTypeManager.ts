export class ShiftTypeManager {
  private readonly PEAK_HOURS = {
    start: 9, // 9 AM
    end: 17,  // 5 PM
  };

  public groupAndSortShiftsByPriority(shifts: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    // Group shifts by type
    shifts.forEach(shift => {
      const type = this.getShiftTypeForTime(shift.start_time);
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push({
        ...shift,
        isPeakPeriod: this.isShiftDuringPeakHours(shift.start_time, shift.end_time)
      });
    });

    // Sort shifts within each group by priority
    Object.keys(grouped).forEach(type => {
      grouped[type].sort((a, b) => {
        // Prioritize peak period shifts
        if (a.isPeakPeriod !== b.isPeakPeriod) {
          return a.isPeakPeriod ? -1 : 1;
        }
        // Then by duration (longer shifts first)
        return b.duration_hours - a.duration_hours;
      });
    });

    return grouped;
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
    const peakStart = this.PEAK_HOURS.start * 60;
    const peakEnd = this.PEAK_HOURS.end * 60;
    
    // Check if any part of the shift overlaps with peak hours
    return (start < peakEnd && end > peakStart);
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  public getPeakPeriodRequirements(shifts: any[]): Record<string, number> {
    const requirements: Record<string, number> = {};
    
    shifts.forEach(shift => {
      const type = this.getShiftTypeForTime(shift.start_time);
      if (this.isShiftDuringPeakHours(shift.start_time, shift.end_time)) {
        requirements[type] = (requirements[type] || 0) + 1;
      }
    });

    return requirements;
  }
}