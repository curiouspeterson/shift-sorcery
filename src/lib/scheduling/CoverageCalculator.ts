import { CoverageRequirement, CoverageStatus, ScheduleAssignment, Shift } from './types';
import { getShiftType } from '@/utils/shiftTypeUtils';

export class CoverageCalculator {
  public calculateRequirements(
    requirements: CoverageRequirement[],
    dayOfWeek: number
  ): CoverageStatus {
    const coverage: CoverageStatus = {};
    
    // Initialize coverage requirements for each shift type
    const shiftTypes = ['Day Shift Early', 'Day Shift', 'Swing Shift', 'Graveyard'];
    
    shiftTypes.forEach(type => {
      coverage[type] = {
        required: this.getRequiredStaffForShiftType(requirements, type),
        assigned: 0,
        isMet: false
      };
    });

    return coverage;
  }

  public checkCoverage(
    assignments: ScheduleAssignment[],
    coverage: CoverageStatus
  ): CoverageStatus {
    const updatedCoverage = { ...coverage };

    // Count assignments by shift type
    assignments.forEach(assignment => {
      const shiftType = getShiftType(assignment.shift_id);
      if (updatedCoverage[shiftType]) {
        updatedCoverage[shiftType].assigned++;
        updatedCoverage[shiftType].isMet = 
          updatedCoverage[shiftType].assigned >= 
          updatedCoverage[shiftType].required;
      }
    });

    return updatedCoverage;
  }

  public calculateFinalCoverage(
    assignments: ScheduleAssignment[],
    shifts: Shift[],
    requirements: CoverageRequirement[]
  ): CoverageStatus {
    const coverage: CoverageStatus = {};
    
    // Initialize coverage status for each shift type
    const shiftTypes = ['Day Shift Early', 'Day Shift', 'Swing Shift', 'Graveyard'];
    
    shiftTypes.forEach(type => {
      const required = this.getRequiredStaffForShiftType(requirements, type);
      const assigned = assignments.filter(a => {
        const shift = shifts.find(s => s.id === a.shift_id);
        return shift && getShiftType(shift.start_time) === type;
      }).length;

      coverage[type] = {
        required,
        assigned,
        isMet: assigned >= required
      };
    });

    return coverage;
  }

  private getRequiredStaffForShiftType(
    requirements: CoverageRequirement[],
    shiftType: string
  ): number {
    // Find all requirements that overlap with this shift type
    const relevantRequirements = requirements.filter(req => {
      const reqShiftType = getShiftType(req.start_time);
      return reqShiftType === shiftType;
    });

    // Return the maximum required staff from overlapping requirements
    return Math.max(
      ...relevantRequirements.map(req => req.min_employees),
      0 // Default to 0 if no requirements found
    );
  }
}