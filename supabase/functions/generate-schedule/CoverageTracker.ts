import { CoverageRequirement } from './types.ts';

export class CoverageTracker {
  private coverage: Map<string, number> = new Map();
  private requirements: Map<string, CoverageRequirement> = new Map();

  initialize(requirements: CoverageRequirement[]) {
    this.coverage.clear();
    this.requirements.clear();
    
    requirements.forEach(req => {
      const key = this.getTimeSlotKey(req.start_time, req.end_time);
      this.coverage.set(key, 0);
      this.requirements.set(key, req);
    });
  }

  incrementCoverage(startTime: string, endTime: string) {
    const key = this.getTimeSlotKey(startTime, endTime);
    const current = this.coverage.get(key) || 0;
    this.coverage.set(key, current + 1);
  }

  isCoverageMet(startTime: string, endTime: string): boolean {
    const key = this.getTimeSlotKey(startTime, endTime);
    const current = this.coverage.get(key) || 0;
    const requirement = this.requirements.get(key);
    return requirement ? current >= requirement.min_employees : true;
  }

  getCurrentCoverage(startTime: string, endTime: string): number {
    const key = this.getTimeSlotKey(startTime, endTime);
    return this.coverage.get(key) || 0;
  }

  getRequiredCoverage(startTime: string, endTime: string): number {
    const key = this.getTimeSlotKey(startTime, endTime);
    const requirement = this.requirements.get(key);
    return requirement?.min_employees || 0;
  }

  private getTimeSlotKey(startTime: string, endTime: string): string {
    return `${startTime}-${endTime}`;
  }

  getCoverageStatus(): Record<string, { required: number; current: number; isMet: boolean }> {
    const status: Record<string, { required: number; current: number; isMet: boolean }> = {};
    
    this.requirements.forEach((req, key) => {
      const current = this.coverage.get(key) || 0;
      status[key] = {
        required: req.min_employees,
        current,
        isMet: current >= req.min_employees
      };
    });

    return status;
  }
}