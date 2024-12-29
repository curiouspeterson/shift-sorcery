import { format } from 'https://esm.sh/date-fns@3.3.1';
import { ShiftAssignmentManager } from './ShiftAssignmentManager.ts';
import { ShiftRequirementsManager } from './ShiftRequirementsManager.ts';
import { EmployeeScoring } from './EmployeeScoring.ts';
import { ShiftTypeManager } from './ShiftTypeManager.ts';
import { EmployeeAvailabilityManager } from './EmployeeAvailabilityManager.ts';
import { SCHEDULING_CONSTANTS } from './constants.ts';

export class SchedulingStrategy {
  private employeeScoring: EmployeeScoring;
  private shiftTypeManager: ShiftTypeManager;
  private employeeAvailabilityManager: EmployeeAvailabilityManager;

  constructor(
    private assignmentManager: ShiftAssignmentManager,
    private requirementsManager: ShiftRequirementsManager
  ) {
    this.employeeScoring = new EmployeeScoring(assignmentManager.getWeeklyHoursTracker());
    this.shiftTypeManager = new ShiftTypeManager();
    this.employeeAvailabilityManager = new EmployeeAvailabilityManager();
  }

  public async assignShiftsForDay(
    currentDate: string,
    data: any,
    scheduleId: string
  ): Promise<boolean> {
    console.log(`\n=== Processing ${format(new Date(currentDate), 'EEEE, MMM d')} ===`);
    
    const dayOfWeek = new Date(currentDate).getDay();
    const shifts = this.shiftTypeManager.groupAndSortShiftsByPriority(data.shifts);
    let overallSuccess = true;

    // First pass: Calculate requirements and identify peak periods
    const requirements = this.calculateDailyRequirements(data.coverageReqs, currentDate);
    console.log('Daily requirements:', requirements);

    // Second pass: Assign shifts with improved distribution
    for (const [shiftType, typeShifts] of Object.entries(shifts)) {
      console.log(`\nProcessing ${shiftType} shifts...`);
      
      const shiftReqs = requirements[shiftType] || { required: 0, isPeak: false };
      const success = await this.assignShiftType(
        shiftType,
        typeShifts as any[],
        data.employees,
        data.availability,
        scheduleId,
        currentDate,
        dayOfWeek,
        shiftReqs
      );
      
      if (!success) {
        overallSuccess = false;
      }
    }

    return overallSuccess;
  }

  private calculateDailyRequirements(coverageReqs: any[], currentDate: string): Record<string, { required: number; isPeak: boolean }> {
    const requirements: Record<string, { required: number; isPeak: boolean }> = {};
    
    coverageReqs.forEach(req => {
      const shiftType = this.shiftTypeManager.getShiftTypeForTime(req.start_time);
      if (!requirements[shiftType]) {
        requirements[shiftType] = { required: 0, isPeak: false };
      }
      
      requirements[shiftType].required = Math.max(requirements[shiftType].required, req.min_employees);
      requirements[shiftType].isPeak = requirements[shiftType].isPeak || req.is_peak_period;
    });

    return requirements;
  }

  private async assignShiftType(
    shiftType: string,
    shifts: any[],
    employees: any[],
    availability: any[],
    scheduleId: string,
    currentDate: string,
    dayOfWeek: number,
    requirements: { required: number; isPeak: boolean }
  ): Promise<boolean> {
    const { required, isPeak } = requirements;
    if (required === 0) return true;

    let assigned = 0;
    const availableEmployees = this.employeeAvailabilityManager.getAvailableEmployees(
      employees,
      availability,
      dayOfWeek,
      shifts,
      this.assignmentManager.getWeeklyHoursTracker()
    );

    console.log(`👥 Found ${availableEmployees.length} available employees for ${shiftType}`);
    console.log(`📊 Requirements: ${required} employees${isPeak ? ' (Peak Period)' : ''}`);

    // Sort shifts by priority
    const sortedShifts = this.sortShiftsByPriority(shifts);

    // Try to assign each shift
    for (const shift of sortedShifts) {
      if (assigned >= required) break;

      const sortedEmployees = this.rankEmployeesForShift(
        availableEmployees,
        shift,
        currentDate,
        isPeak
      );
      
      for (const employee of sortedEmployees) {
        if (assigned >= required) break;

        if (this.canAssignShift(employee, shift)) {
          console.log(`✅ Assigning ${employee.first_name} ${employee.last_name} to ${shift.name}`);
          
          this.assignmentManager.assignShift(scheduleId, employee, shift, currentDate);
          assigned++;
          
          // Remove assigned employee from available pool
          const index = availableEmployees.findIndex(e => e.id === employee.id);
          if (index > -1) {
            availableEmployees.splice(index, 1);
          }
          
          break;
        }
      }
    }

    const staffingPercentage = (assigned / required) * 100;
    console.log(`📊 Staffing level for ${shiftType}: ${staffingPercentage.toFixed(1)}% (${assigned}/${required})`);
    
    return staffingPercentage >= SCHEDULING_CONSTANTS.MIN_STAFF_PERCENTAGE;
  }

  private sortShiftsByPriority(shifts: any[]): any[] {
    return [...shifts].sort((a, b) => {
      // Prioritize longer shifts
      const durationDiff = b.duration_hours - a.duration_hours;
      if (durationDiff !== 0) return durationDiff;
      
      // Then sort by start time
      return a.start_time.localeCompare(b.start_time);
    });
  }

  private rankEmployeesForShift(
    employees: any[],
    shift: any,
    currentDate: string,
    isPeakPeriod: boolean
  ): any[] {
    return [...employees].sort((a, b) => {
      const scoreA = this.employeeScoring.scoreEmployee(
        a,
        shift,
        currentDate,
        this.assignmentManager.getAssignments(),
        isPeakPeriod
      );
      const scoreB = this.employeeScoring.scoreEmployee(
        b,
        shift,
        currentDate,
        this.assignmentManager.getAssignments(),
        isPeakPeriod
      );
      return scoreB - scoreA;
    });
  }

  private canAssignShift(employee: any, shift: any): boolean {
    return this.employeeAvailabilityManager.canAssignShift(
      employee,
      shift,
      this.assignmentManager,
      this.assignmentManager.getWeeklyHoursTracker()
    );
  }
}