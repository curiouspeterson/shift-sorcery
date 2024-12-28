import { format } from 'https://esm.sh/date-fns@3.3.1';
import { ShiftAssignmentManager } from './ShiftAssignmentManager.ts';
import { ShiftRequirementsManager } from './ShiftRequirementsManager.ts';
import { getShiftType } from './ShiftUtils.ts';

export class SchedulingStrategy {
  constructor(
    private assignmentManager: ShiftAssignmentManager,
    private requirementsManager: ShiftRequirementsManager
  ) {}

  public async assignShiftsForDay(
    currentDate: string,
    data: any,
    scheduleId: string
  ): Promise<boolean> {
    console.log(`\n=== Processing ${format(new Date(currentDate), 'EEEE, MMM d')} ===`);
    
    const dayOfWeek = new Date(currentDate).getDay();
    const shiftTypes = ["Day Shift Early", "Day Shift", "Swing Shift", "Graveyard"];

    // Get all available employees for this day
    const availableEmployees = this.getAvailableEmployees(data, dayOfWeek);
    console.log(`Available employees for day: ${availableEmployees.length}`);

    if (availableEmployees.length === 0) {
      console.log('❌ No available employees for this day');
      return false;
    }

    // Process each shift type
    for (const shiftType of shiftTypes) {
      const success = await this.assignShiftType(
        shiftType,
        availableEmployees,
        data,
        scheduleId,
        currentDate,
        dayOfWeek
      );
      
      if (!success) return false;
    }

    return true;
  }

  private getAvailableEmployees(data: any, dayOfWeek: number): any[] {
    return data.employees.filter(employee => {
      const hasAvailability = data.availability.some(a => 
        a.employee_id === employee.id && 
        a.day_of_week === dayOfWeek
      );
      return hasAvailability;
    });
  }

  private async assignShiftType(
    shiftType: string,
    availableEmployees: any[],
    data: any,
    scheduleId: string,
    currentDate: string,
    dayOfWeek: number
  ): Promise<boolean> {
    console.log(`\n=== Processing ${shiftType} ===`);
    const required = this.requirementsManager.getRequiredStaffForShiftType(shiftType);
    console.log(`Required staff for ${shiftType}: ${required}`);

    if (required === 0) {
      console.log(`No requirements for ${shiftType}, skipping`);
      return true;
    }

    const shiftsOfType = data.shifts.filter(s => getShiftType(s.start_time) === shiftType);
    let currentCount = 0;
    let attempts = 0;
    const maxAttemptsPerShift = 15;

    while (currentCount < required && attempts < maxAttemptsPerShift) {
      attempts++;
      console.log(`\nAttempt ${attempts} for ${shiftType} (Current: ${currentCount}/${required})`);

      const availableForShift = this.getAvailableEmployeesForShift(availableEmployees);
      
      if (availableForShift.length === 0) {
        console.log(`No more available employees for ${shiftType}`);
        break;
      }

      const assigned = await this.tryAssignEmployees(
        availableForShift,
        shiftsOfType,
        currentDate,
        dayOfWeek,
        scheduleId
      );

      if (assigned) {
        currentCount++;
      } else if (currentCount < required) {
        console.log(`Failed to meet requirements for ${shiftType}: ${currentCount}/${required}`);
        return false;
      }
    }

    return true;
  }

  private getAvailableEmployeesForShift(employees: any[]): any[] {
    return employees
      .filter(employee => !this.assignmentManager.isEmployeeAssignedToday(employee.id))
      .sort((a, b) => {
        const hoursA = this.assignmentManager.getEmployeeWeeklyHours(a.id);
        const hoursB = this.assignmentManager.getEmployeeWeeklyHours(b.id);
        return hoursA - hoursB;
      });
  }

  private async tryAssignEmployees(
    employees: any[],
    shifts: any[],
    currentDate: string,
    dayOfWeek: number,
    scheduleId: string
  ): Promise<boolean> {
    for (const employee of employees) {
      const nextShift = shifts[0];
      if (!this.assignmentManager.canAssignShiftHours(employee.id, nextShift)) {
        console.log(`${employee.first_name} would exceed weekly hours limit`);
        continue;
      }

      for (const shift of shifts) {
        if (this.assignmentManager.canAssignShift(
          employee,
          shift,
          [],  // Availability is checked earlier
          dayOfWeek
        )) {
          this.assignmentManager.assignShift(scheduleId, employee, shift, currentDate);
          console.log(`✅ Assigned ${employee.first_name} to shift`);
          return true;
        }
      }
    }
    
    return false;
  }
}