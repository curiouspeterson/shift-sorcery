import { Employee, Shift, ScheduleAssignment, EmployeeAvailability } from '../types';
import { getShiftType } from '@/utils/shiftUtils';
import { SCHEDULING_CONSTANTS } from '../constants';

export class ShiftDistributor {
  distributeShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[]
  ): ScheduleAssignment[] {
    console.log(`\n📋 Starting shift distribution for ${date}`);
    const assignments: ScheduleAssignment[] = [];
    const dayOfWeek = new Date(date).getDay();

    // Sort shifts by priority (graveyard > early > day > swing)
    const sortedShifts = [...shifts].sort((a, b) => {
      const priorityA = SCHEDULING_CONSTANTS.SHIFT_PRIORITY[getShiftType(a.start_time) as keyof typeof SCHEDULING_CONSTANTS.SHIFT_PRIORITY];
      const priorityB = SCHEDULING_CONSTANTS.SHIFT_PRIORITY[getShiftType(b.start_time) as keyof typeof SCHEDULING_CONSTANTS.SHIFT_PRIORITY];
      return priorityA - priorityB;
    });

    // Track assigned employees for this day
    const assignedEmployees = new Set<string>();

    for (const shift of sortedShifts) {
      const shiftType = getShiftType(shift.start_time);
      const minRequired = SCHEDULING_CONSTANTS.MIN_STAFF[shiftType as keyof typeof SCHEDULING_CONSTANTS.MIN_STAFF];
      const maxAllowed = shift.max_employees || minRequired;

      console.log(`\n🔄 Processing ${shift.name} (${shiftType})`);
      console.log(`Required: ${minRequired}, Max Allowed: ${maxAllowed}`);

      // Get available employees for this shift
      let availableEmployees = this.getAvailableEmployees(
        employees,
        shift,
        availability,
        dayOfWeek,
        assignments,
        assignedEmployees
      );

      console.log(`Found ${availableEmployees.length} available employees`);

      // Sort employees by hours worked (ascending) to ensure fair distribution
      availableEmployees.sort((a, b) => {
        const aAssignments = assignments.filter(ass => ass.employee_id === a.id).length;
        const bAssignments = assignments.filter(ass => ass.employee_id === b.id).length;
        return aAssignments - bAssignments;
      });

      // Assign employees up to the required minimum or maximum allowed
      const toAssign = Math.min(maxAllowed, Math.max(minRequired, availableEmployees.length));
      
      for (let i = 0; i < toAssign && i < availableEmployees.length; i++) {
        const employee = availableEmployees[i];
        assignments.push({
          schedule_id: scheduleId,
          employee_id: employee.id,
          shift_id: shift.id,
          date: date
        });
        assignedEmployees.add(employee.id);
        console.log(`✅ Assigned ${employee.id} to ${shift.name}`);
      }

      const assigned = assignments.filter(a => a.shift_id === shift.id).length;
      console.log(`📊 Final assignments for ${shift.name}: ${assigned}/${minRequired} (min) or ${maxAllowed} (max)`);
    }

    return assignments;
  }

  private getAvailableEmployees(
    employees: Employee[],
    shift: Shift,
    availability: EmployeeAvailability[],
    dayOfWeek: number,
    existingAssignments: ScheduleAssignment[],
    assignedToday: Set<string>
  ): Employee[] {
    return employees.filter(employee => {
      // Skip if already assigned today
      if (assignedToday.has(employee.id)) {
        console.log(`Employee ${employee.id} already assigned today`);
        return false;
      }

      // Check if employee has availability for this shift and day
      const hasAvailability = availability.some(
        avail =>
          avail.employee_id === employee.id &&
          avail.day_of_week === dayOfWeek &&
          this.isTimeWithinAvailability(
            shift.start_time,
            shift.end_time,
            avail.start_time,
            avail.end_time
          )
      );

      if (!hasAvailability) {
        console.log(`Employee ${employee.id} not available for this shift`);
        return false;
      }

      // Check weekly hours limit
      const weeklyHours = this.calculateWeeklyHours(employee.id, existingAssignments, shift);
      if (weeklyHours > employee.weekly_hours_limit) {
        console.log(`Employee ${employee.id} would exceed weekly hours limit`);
        return false;
      }

      return true;
    });
  }

  private isTimeWithinAvailability(
    shiftStart: string,
    shiftEnd: string,
    availStart: string,
    availEnd: string
  ): boolean {
    // Convert times to minutes for easier comparison
    const convertToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const shiftStartMins = convertToMinutes(shiftStart);
    const shiftEndMins = convertToMinutes(shiftEnd);
    const availStartMins = convertToMinutes(availStart);
    const availEndMins = convertToMinutes(availEnd);

    // Handle overnight shifts
    if (shiftEndMins <= shiftStartMins) {
      // Shift crosses midnight
      return (availEndMins <= availStartMins) || // Availability also crosses midnight
             (shiftStartMins >= availStartMins && availEndMins >= shiftStartMins) || // Start time fits
             (shiftEndMins <= availEndMins && availStartMins <= shiftEndMins); // End time fits
    }

    // Regular shift (doesn't cross midnight)
    if (availEndMins <= availStartMins) {
      // Availability crosses midnight
      return shiftStartMins >= availStartMins || shiftEndMins <= availEndMins;
    }

    return shiftStartMins >= availStartMins && shiftEndMins <= availEndMins;
  }

  private calculateWeeklyHours(
    employeeId: string,
    existingAssignments: ScheduleAssignment[],
    currentShift: Shift
  ): number {
    const employeeAssignments = existingAssignments.filter(
      a => a.employee_id === employeeId
    );

    let totalHours = employeeAssignments.length * 8; // Assuming 8 hours per shift
    totalHours += currentShift.duration_hours || 8;

    return totalHours;
  }
}