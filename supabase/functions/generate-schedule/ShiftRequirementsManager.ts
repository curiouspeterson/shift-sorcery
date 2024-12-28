import { CoverageRequirement, ShiftRequirements } from './types.ts';
import { getShiftType } from './shiftUtils.ts';

export class ShiftRequirementsManager {
  private requirements: ShiftRequirements = {
    graveyardShift: 6,  // Updated based on requirements
    swingShift: 7,      // Updated based on requirements
    dayShift: 8,        // Updated based on requirements
    earlyShift: 6       // Updated based on requirements
  };

  constructor(coverageRequirements: CoverageRequirement[]) {
    // Initialize from coverage requirements if provided
    coverageRequirements.forEach(req => {
      const shiftType = getShiftType(req.start_time);
      switch (shiftType) {
        case 'Graveyard':
          this.requirements.graveyardShift = req.min_employees;
          break;
        case 'Swing Shift':
          this.requirements.swingShift = req.min_employees;
          break;
        case 'Day Shift':
          this.requirements.dayShift = req.min_employees;
          break;
        case 'Day Shift Early':
          this.requirements.earlyShift = req.min_employees;
          break;
      }
    });

    console.log('Shift requirements:', this.requirements);
  }

  public getRequirements(): ShiftRequirements {
    return { ...this.requirements };
  }

  public getRequiredStaffForShiftType(shiftType: string): number {
    switch (shiftType) {
      case 'Graveyard':
        return this.requirements.graveyardShift;
      case 'Swing Shift':
        return this.requirements.swingShift;
      case 'Day Shift':
        return this.requirements.dayShift;
      case 'Day Shift Early':
        return this.requirements.earlyShift;
      default:
        return 0;
    }
  }
}