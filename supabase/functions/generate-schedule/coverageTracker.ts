import { CoverageRequirement, Shift, CoverageTracking } from './types.ts';
import { shiftCoversPeriod } from './shiftUtils.ts';

export class CoverageTracker {
  private tracking: Map<string, CoverageTracking>;

  constructor(requirements: CoverageRequirement[]) {
    this.tracking = new Map(
      requirements.map(req => [`${req.start_time}-${req.end_time}`, {
        requirement: req,
        currentCount: 0,
        minimumMet: false
      }])
    );
  }

  public updateCoverage(shift: Shift): boolean {
    let coverageUpdated = false;
    let allMinimumsMet = true;

    this.tracking.forEach((tracking, key) => {
      if (shiftCoversPeriod(shift, tracking.requirement)) {
        if (!tracking.minimumMet) {
          tracking.currentCount++;
          tracking.minimumMet = tracking.currentCount >= tracking.requirement.min_employees;
          coverageUpdated = true;
        }
      }
      if (!tracking.minimumMet) {
        allMinimumsMet = false;
      }
    });

    return coverageUpdated && !allMinimumsMet;
  }

  public getCoverageStatus(): Record<string, { current: number; required: number }> {
    const status: Record<string, { current: number; required: number }> = {};
    this.tracking.forEach((tracking, key) => {
      status[key] = {
        current: tracking.currentCount,
        required: tracking.requirement.min_employees
      };
    });
    return status;
  }

  public logCoverageStatus(date: string): void {
    console.log('Coverage status for', date);
    this.tracking.forEach((value, key) => {
      console.log(`${key}: ${value.currentCount}/${value.requirement.min_employees} (Minimum met: ${value.minimumMet})`);
    });
  }

  public hasUnmetRequirements(): boolean {
    return Array.from(this.tracking.values()).some(tracking => !tracking.minimumMet);
  }
}