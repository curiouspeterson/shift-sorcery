import { format } from 'https://esm.sh/date-fns@3.3.1';
import { ShiftAssignmentManager } from './ShiftAssignmentManager.ts';
import { ShiftRequirementsManager } from './ShiftRequirementsManager.ts';
import { EmployeeScoring } from './EmployeeScoring.ts';
import { SCHEDULING_CONSTANTS } from './constants.ts';

export class SchedulingStrategy {
  private employeeScoring: EmployeeScoring;

  constructor(
    private assignmentManager: ShiftAssignmentManager,
    private requirementsManager: ShiftRequirementsManager
  ) {
    this.employeeScoring = new EmployeeScoring(assignmentManager.getWeeklyHoursTracker());
  }

  public async assignShiftsForDay(
    currentDate: string,
    data: any,
    scheduleId: string
  ): Promise<boolean> {
    console.log(`\n=== Processing ${format(new Date(currentDate), 'EEEE, MMM d')} ===`);
    
    const dayOfWeek = new Date(currentDate).getDay();
    const shifts = this.groupShiftsByType(data.shifts);
    
    // Process each shift type in order of priority
    for (const [shiftType, typeShifts] of Object.entries(shifts)) {
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
        // Continue with next shift type instead of failing completely
      }
    }

    // Check if we met minimum staffing requirements overall
    return this.checkMinimumStaffingMet();
  }

  private groupShiftsByType(shifts: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    shifts.forEach(shift => {
      const type = this.getShiftType(shift.start_time);
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(shift);
    });
    return grouped;
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
    const availableEmployees = this.getAvailableEmployees(
      employees,
      availability,
      dayOfWeek,
      shifts
    );

    // Try to assign each shift
    for (const shift of shifts) {
      const sortedEmployees = this.rankEmployees(
        availableEmployees,
        shift,
        currentDate,
        this.assignmentManager.getAssignments()
      );

      for (const employee of sortedEmployees) {
        if (this.canAssignShift(employee, shift, currentDate)) {
          this.assignmentManager.assignShift(scheduleId, employee, shift, currentDate);
          assigned++;
          break;
        }
      }
    }

    const staffingPercentage = (assigned / required) * 100;
    console.log(`Staffing level for ${shiftType}: ${staffingPercentage.toFixed(1)}%`);
    
    return staffingPercentage >= SCHEDULING_CONSTANTS.MIN_STAFF_PERCENTAGE;
  }

  private getAvailableEmployees(
    employees: any[],
    availability: any[],
    dayOfWeek: number,
    shifts: any[]
  ): any[] {
    return employees.filter(employee => {
      // Check if employee has availability for any of the shifts
      return shifts.some(shift => 
        availability.some(a => 
          a.employee_id === employee.id &&
          a.day_of_week === dayOfWeek &&
          a.shift_id === shift.id
        )
      );
    });
  }

  private rankEmployees(
    employees: any[],
    shift: any,
    currentDate: string,
    assignments: any[]
  ): any[] {
    return [...employees].sort((a, b) => {
      const scoreA = this.employeeScoring.scoreEmployee(a, shift, currentDate, assignments);
      const scoreB = this.employeeScoring.scoreEmployee(b, shift, currentDate, assignments);
      return scoreB - scoreA;
    });
  }

  private canAssignShift(
    employee: any,
    shift: any,
    currentDate: string
  ): boolean {
    return !this.assignmentManager.isEmployeeAssignedToday(employee.id);
  }

  private getShiftType(startTime: string): string {
    const hour = parseInt(startTime.split(':')[0]);
    if (hour >= 4 && hour < 8) return "Day Shift Early";
    if (hour >= 8 && hour < 16) return "Day Shift";
    if (hour >= 16 && hour < 22) return "Swing Shift";
    return "Graveyard";
  }

  private checkMinimumStaffingMet(): boolean {
    const counts = this.assignmentManager.getCurrentCounts();
    const requirements = this.requirementsManager.getRequirements();
    
    for (const [shiftType, required] of Object.entries(requirements)) {
      const assigned = counts[shiftType] || 0;
      const percentage = (assigned / required) * 100;
      
      if (percentage < SCHEDULING_CONSTANTS.MIN_STAFF_PERCENTAGE) {
        console.log(`Failed minimum staffing for ${shiftType}: ${percentage.toFixed(1)}%`);
        return false;
      }
    }
    
    return true;
  }
}