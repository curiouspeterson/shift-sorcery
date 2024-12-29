import { CoverageStatus, ScheduleAssignment, Shift, CoverageRequirement } from './types.ts';
import { getShiftType } from './ShiftUtils.ts';

export class CoverageCalculator {
  calculateCoverage(
    assignments: ScheduleAssignment[],
    shifts: Shift[],
    requirements: CoverageRequirement[]
  ): CoverageStatus {
    const coverage: CoverageStatus = {};
    
    // Initialize coverage tracking for each shift type
    const shiftTypes = ['Day Shift Early', 'Day Shift', 'Swing Shift', 'Graveyard'];
    shiftTypes.forEach(type => {
      coverage[type] = {
        required: this.getRequiredStaffForShiftType(requirements, type),
        assigned: this.getAssignedStaffForShiftType(assignments, shifts, type),
        isMet: false
      };
    });

    // Update isMet status
    Object.keys(coverage).forEach(type => {
      coverage[type].isMet = coverage[type].assigned >= coverage[type].required;
    });

    return coverage;
  }

  private getRequiredStaffForShiftType(
    requirements: CoverageRequirement[],
    shiftType: string
  ): number {
    let maxRequired = 0;
    requirements.forEach(req => {
      const reqShiftType = getShiftType(req.start_time);
      if (reqShiftType === shiftType) {
        maxRequired = Math.max(maxRequired, req.min_employees);
      }
    });
    return maxRequired;
  }

  private getAssignedStaffForShiftType(
    assignments: ScheduleAssignment[],
    shifts: Shift[],
    shiftType: string
  ): number {
    return assignments.filter(assignment => {
      const shift = shifts.find(s => s.id === assignment.shift_id);
      return shift && getShiftType(shift.start_time) === shiftType;
    }).length;
  }
}