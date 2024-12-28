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
    const shifts = this.groupAndSortShiftsByPriority(data.shifts);
    let overallSuccess = true;

    // Process each shift type in order of priority
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

    // Consider partial success if we met minimum staffing requirements
    const staffingPercentage = this.calculateOverallStaffingPercentage();
    console.log(`Overall staffing percentage for ${currentDate}: ${staffingPercentage.toFixed(1)}%`);
    
    return staffingPercentage >= SCHEDULING_CONSTANTS.MIN_STAFF_PERCENTAGE;
  }

  private groupAndSortShiftsByPriority(shifts: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    shifts.forEach(shift => {
      const type = this.getShiftType(shift.start_time);
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(shift);
    });

    // Sort shifts by priority
    return Object.fromEntries(
      Object.entries(grouped).sort(([a], [b]) => 
        SCHEDULING_CONSTANTS.SHIFT_PRIORITY[a as keyof typeof SCHEDULING_CONSTANTS.SHIFT_PRIORITY] - 
        SCHEDULING_CONSTANTS.SHIFT_PRIORITY[b as keyof typeof SCHEDULING_CONSTANTS.SHIFT_PRIORITY]
      )
    );
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

    console.log(`Found ${availableEmployees.length} available employees for ${shiftType}`);

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
          
          // Remove employee from available pool for this shift type
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

  private getAvailableEmployees(
    employees: any[],
    availability: any[],
    dayOfWeek: number,
    shifts: any[]
  ): any[] {
    return employees.filter(employee => {
      // Check if employee has availability for any of the shifts
      const hasAvailability = shifts.some(shift => 
        availability.some(a => 
          a.employee_id === employee.id &&
          a.day_of_week === dayOfWeek &&
          a.shift_id === shift.id
        )
      );

      // Check if employee hasn't exceeded weekly hours
      const currentHours = this.assignmentManager.getWeeklyHoursTracker().getCurrentHours(employee.id);
      const withinHoursLimit = currentHours < SCHEDULING_CONSTANTS.MAX_HOURS_PER_WEEK;

      return hasAvailability && withinHoursLimit;
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
    // Check if employee is already assigned for this day
    if (this.assignmentManager.isEmployeeAssignedToday(employee.id)) {
      return false;
    }

    // Check weekly hours limit
    const shiftHours = this.getShiftDuration(shift);
    const currentHours = this.assignmentManager.getWeeklyHoursTracker().getCurrentHours(employee.id);
    if ((currentHours + shiftHours) > SCHEDULING_CONSTANTS.MAX_HOURS_PER_WEEK) {
      return false;
    }

    return true;
  }

  private getShiftType(startTime: string): string {
    const hour = parseInt(startTime.split(':')[0]);
    if (hour >= 4 && hour < 8) return "Day Shift Early";
    if (hour >= 8 && hour < 16) return "Day Shift";
    if (hour >= 16 && hour < 22) return "Swing Shift";
    return "Graveyard";
  }

  private getShiftDuration(shift: any): number {
    const start = new Date(`2000-01-01T${shift.start_time}`);
    let end = new Date(`2000-01-01T${shift.end_time}`);
    
    if (end <= start) {
      end = new Date(`2000-01-02T${shift.end_time}`);
    }
    
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
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