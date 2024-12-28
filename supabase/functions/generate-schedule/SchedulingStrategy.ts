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

    for (const [shiftType, typeShifts] of Object.entries(shifts)) {
      console.log(`\nProcessing ${shiftType} shifts...`);
      const success = await this.assignShiftType(
        shiftType,
        typeShifts,
        data.employees,
        data.availability,
        scheduleId,
        currentDate,
        dayOfWeek
      );
      
      if (!success) {
        console.log(`Warning: Could not fully staff ${shiftType} for ${currentDate}`);
        overallSuccess = false;
      }
    }

    const staffingPercentage = this.calculateOverallStaffingPercentage();
    console.log(`Overall staffing percentage for ${currentDate}: ${staffingPercentage.toFixed(1)}%`);
    
    return staffingPercentage >= SCHEDULING_CONSTANTS.MIN_STAFF_PERCENTAGE;
  }

  private async assignShiftType(
    shiftType: string,
    shifts: any[],
    employees: any[],
    availability: any[],
    scheduleId: string,
    currentDate: string,
    dayOfWeek: number
  ): Promise<boolean> {
    const required = this.requirementsManager.getRequiredStaffForShiftType(shiftType);
    console.log(`\nProcessing ${shiftType} - Need ${required} employees`);

    if (required === 0) return true;

    let assigned = 0;
    const availableEmployees = this.employeeAvailabilityManager.getAvailableEmployees(
      employees,
      availability,
      dayOfWeek,
      shifts,
      this.assignmentManager.getWeeklyHoursTracker()
    );

    console.log(`Found ${availableEmployees.length} available employees for ${shiftType}`);

    for (const shift of shifts) {
      const sortedEmployees = this.rankEmployees(availableEmployees, shift, currentDate);

      for (const employee of sortedEmployees) {
        if (this.employeeAvailabilityManager.canAssignShift(
          employee,
          shift,
          this.assignmentManager,
          this.assignmentManager.getWeeklyHoursTracker()
        )) {
          this.assignmentManager.assignShift(scheduleId, employee, shift, currentDate);
          assigned++;
          
          const index = availableEmployees.findIndex(e => e.id === employee.id);
          if (index > -1) {
            availableEmployees.splice(index, 1);
          }
          
          break;
        }
      }
    }

    const staffingPercentage = (assigned / required) * 100;
    console.log(`Staffing level for ${shiftType}: ${staffingPercentage.toFixed(1)}%`);
    
    return staffingPercentage >= SCHEDULING_CONSTANTS.MIN_STAFF_PERCENTAGE;
  }

  private rankEmployees(
    employees: any[],
    shift: any,
    currentDate: string,
  ): any[] {
    return [...employees].sort((a, b) => {
      const scoreA = this.employeeScoring.scoreEmployee(a, shift, currentDate, this.assignmentManager.getAssignments());
      const scoreB = this.employeeScoring.scoreEmployee(b, shift, currentDate, this.assignmentManager.getAssignments());
      return scoreB - scoreA;
    });
  }

  private calculateOverallStaffingPercentage(): number {
    const counts = this.assignmentManager.getCurrentCounts();
    const requirements = this.requirementsManager.getRequirements();
    let totalAssigned = 0;
    let totalRequired = 0;
    
    Object.entries(requirements).forEach(([shiftType, required]) => {
      totalAssigned += counts[shiftType] || 0;
      totalRequired += required;
    });
    
    return totalRequired > 0 ? (totalAssigned / totalRequired) * 100 : 100;
  }
}