import { CoverageRequirement, ShiftRequirements } from './types.ts';
import { getShiftType } from './shiftUtils.ts';

export class ShiftRequirementsManager {
  private requirements: ShiftRequirements = {
    earlyShift: 6,
    dayShift: 8,
    swingShift: 7,
    graveyardShift: 6
  };

  constructor(coverageRequirements: CoverageRequirement[]) {
    // Initialize from coverage requirements if provided
    coverageRequirements.forEach(req => {
      const shiftType = getShiftType(req.start_time);
      switch (shiftType) {
        case 'Day Shift Early':
          this.requirements.earlyShift = req.min_employees;
          break;
        case 'Day Shift':
          this.requirements.dayShift = req.min_employees;
          break;
        case 'Swing Shift':
          this.requirements.swingShift = req.min_employees;
          break;
        case 'Graveyard':
          this.requirements.graveyardShift = req.min_employees;
          break;
      }
    });
  }

  public getRequirements(): ShiftRequirements {
    return { ...this.requirements };
  }

  public getRequiredStaffForShiftType(shiftType: string): number {
    switch (shiftType) {
      case 'Day Shift Early':
        return this.requirements.earlyShift;
      case 'Day Shift':
        return this.requirements.dayShift;
      case 'Swing Shift':
        return this.requirements.swingShift;
      case 'Graveyard':
        return this.requirements.graveyardShift;
      default:
        return 0;
    }
  }
}