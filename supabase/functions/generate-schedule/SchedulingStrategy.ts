import { format } from 'https://esm.sh/date-fns@3.3.1';
import { ShiftAssignmentManager } from './ShiftAssignmentManager.ts';
import { ShiftRequirementsManager } from './ShiftRequirementsManager.ts';
import { getShiftType } from './ShiftUtils.ts';
import { SCHEDULING_CONSTANTS } from './constants.ts';

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
      
      if (!success) {
        console.log(`Failed to assign ${shiftType} shifts for ${currentDate}`);
        // Instead of failing immediately, check if we have met minimum staffing requirements
        const assigned = this.assignmentManager.getCurrentCounts()[shiftType] || 0;
        const required = this.requirementsManager.getRequiredStaffForShiftType(shiftType);
        const percentage = (assigned / required) * 100;
        
        if (percentage < SCHEDULING_CONSTANTS.MIN_STAFF_PERCENTAGE) {
          console.log(`Insufficient staffing for ${shiftType}: ${percentage.toFixed(1)}% of required staff`);
          return false;
        } else {
          console.log(`Acceptable partial staffing for ${shiftType}: ${percentage.toFixed(1)}% of required staff`);
          continue;
        }
      }
    }

    return true;
  }

  private getAvailableEmployees(data: any, dayOfWeek: number): any[] {
    // First get all employees with availability for this day
    const employeesWithAvailability = data.employees.filter(employee => {
      const hasAvailability = data.availability.some(a => 
        a.employee_id === employee.id && 
        a.day_of_week === dayOfWeek
      );
      
      if (!hasAvailability) {
        console.log(`Employee ${employee.first_name} has no availability for day ${dayOfWeek}`);
      }
      
      return hasAvailability;
    });

    // Sort by weekly hours to prioritize employees with fewer hours
    return employeesWithAvailability.sort((a, b) => {
      const hoursA = this.assignmentManager.getEmployeeWeeklyHours(a.id);
      const hoursB = this.assignmentManager.getEmployeeWeeklyHours(b.id);
      return hoursA - hoursB;
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

    while (currentCount < required && attempts < SCHEDULING_CONSTANTS.MAX_ATTEMPTS_PER_SHIFT) {
      attempts++;
      console.log(`\nAttempt ${attempts} for ${shiftType} (Current: ${currentCount}/${required})`);

      // Get available employees who haven't been assigned today and sort by weekly hours
      const availableForShift = this.getAvailableEmployeesForShift(availableEmployees);
      
      if (availableForShift.length === 0) {
        console.log(`No more available employees for ${shiftType}`);
        // Return true if we have at least the minimum required percentage
        const percentage = (currentCount / required) * 100;
        return percentage >= SCHEDULING_CONSTANTS.MIN_STAFF_PERCENTAGE;
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
        console.log(`Successfully assigned shift (${currentCount}/${required})`);
      } else if (attempts >= SCHEDULING_CONSTANTS.MAX_ATTEMPTS_PER_SHIFT) {
        console.log(`Max attempts reached for ${shiftType}`);
        // Return true if we have at least the minimum required percentage
        const percentage = (currentCount / required) * 100;
        return percentage >= SCHEDULING_CONSTANTS.MIN_STAFF_PERCENTAGE;
      }
    }

    return currentCount >= Math.ceil(required * SCHEDULING_CONSTANTS.MIN_STAFF_PERCENTAGE / 100);
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
          console.log(`✅ Assigned ${employee.first_name} to ${shift.name}`);
          return true;
        }
      }
    }
    
    return false;
  }
}