import { SCHEDULING_CONSTANTS } from './constants.ts';

export class EmployeeAvailabilityManager {
  public getAvailableEmployees(
    employees: any[],
    availability: any[],
    dayOfWeek: number,
    shifts: any[],
    weeklyHoursTracker: any
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
      const currentHours = weeklyHoursTracker.getCurrentHours(employee.id);
      const withinHoursLimit = currentHours < SCHEDULING_CONSTANTS.MAX_HOURS_PER_WEEK;

      return hasAvailability && withinHoursLimit;
    });
  }

  public canAssignShift(
    employee: any,
    shift: any,
    dailyTracker: any,
    weeklyHoursTracker: any
  ): boolean {
    // Check if employee is already assigned for this day
    if (dailyTracker.isEmployeeAssignedToday(employee.id)) {
      console.log(`Employee ${employee.id} already assigned today`);
      return false;
    }

    // Check weekly hours limit
    const shiftHours = this.getShiftDuration(shift);
    const currentHours = weeklyHoursTracker.getCurrentHours(employee.id);
    if ((currentHours + shiftHours) > SCHEDULING_CONSTANTS.MAX_HOURS_PER_WEEK) {
      console.log(`Employee ${employee.id} would exceed weekly hours limit`);
      return false;
    }

    return true;
  }

  private getShiftDuration(shift: any): number {
    const start = new Date(`2000-01-01T${shift.start_time}`);
    let end = new Date(`2000-01-01T${shift.end_time}`);
    
    if (end <= start) {
      end = new Date(`2000-01-02T${shift.end_time}`);
    }
    
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }
}