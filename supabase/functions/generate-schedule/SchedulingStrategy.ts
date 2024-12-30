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
    let totalAssigned = 0;
    let totalRequired = 0;

    // Process each shift type
    for (const [shiftType, typeShifts] of Object.entries(shifts)) {
      console.log(`\nProcessing ${shiftType} shifts...`);
      
      const required = this.requirementsManager.getRequiredStaffForShiftType(shiftType);
      console.log(`Required staff for ${shiftType}: ${required}`);
      
      const assigned = await this.assignShiftType(
        shiftType,
        typeShifts as any[],
        data.employees,
        data.availability,
        scheduleId,
        currentDate,
        dayOfWeek,
        required
      );
      
      totalAssigned += assigned;
      totalRequired += required;
      
      if (assigned < required) {
        console.log(`Warning: Could not fully staff ${shiftType} for ${currentDate}`);
        console.log(`Assigned: ${assigned}, Required: ${required}`);
        overallSuccess = false;
      }
    }

    const staffingPercentage = (totalAssigned / totalRequired) * 100;
    console.log(`Overall staffing for ${currentDate}: ${staffingPercentage.toFixed(1)}% (${totalAssigned}/${totalRequired})`);
    
    return staffingPercentage >= SCHEDULING_CONSTANTS.MIN_STAFF_PERCENTAGE;
  }

  private async assignShiftType(
    shiftType: string,
    shifts: any[],
    employees: any[],
    availability: any[],
    scheduleId: string,
    currentDate: string,
    dayOfWeek: number,
    required: number
  ): Promise<number> {
    console.log(`\nAssigning ${shiftType} - Need ${required} employees`);

    if (required === 0) return 0;

    let assigned = 0;
    const availableEmployees = this.employeeAvailabilityManager.getAvailableEmployees(
      employees,
      availability,
      dayOfWeek,
      shifts,
      this.assignmentManager.getWeeklyHoursTracker()
    );

    console.log(`Found ${availableEmployees.length} available employees for ${shiftType}`);

    // Sort shifts by duration (longer shifts first)
    const sortedShifts = [...shifts].sort((a, b) => {
      const getDuration = (shift: any) => {
        const startHour = parseInt(shift.start_time.split(':')[0]);
        const endHour = parseInt(shift.end_time.split(':')[0]);
        return endHour < startHour ? (endHour + 24) - startHour : endHour - startHour;
      };
      return getDuration(b) - getDuration(a);
    });

    // Try to assign each shift
    for (const shift of sortedShifts) {
      if (assigned >= required) break;

      const sortedEmployees = this.rankEmployees(availableEmployees, shift, currentDate);
      
      for (const employee of sortedEmployees) {
        if (assigned >= required) break;

        if (this.employeeAvailabilityManager.canAssignShift(
          employee,
          shift,
          this.assignmentManager,
          this.assignmentManager.getWeeklyHoursTracker()
        )) {
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
    console.log(`Staffing level for ${shiftType}: ${staffingPercentage.toFixed(1)}% (${assigned}/${required})`);
    
    return assigned;
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
}