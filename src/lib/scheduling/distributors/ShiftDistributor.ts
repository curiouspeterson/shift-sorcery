import { Employee, Shift, ScheduleAssignment, EmployeeAvailability } from '../types';
import { getShiftType } from '../utils/shiftUtils';
import { SCHEDULING_CONSTANTS } from '../constants';

export class ShiftDistributor {
  distributeShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[]
  ): ScheduleAssignment[] {
    console.log(`\n📋 Distributing shifts for date: ${date}`);
    const assignments: ScheduleAssignment[] = [];
    const dayOfWeek = new Date(date).getDay();
    const assignedToday = new Set<string>();

    // Sort shifts by priority (graveyard > early > day > swing)
    const sortedShifts = [...shifts].sort((a, b) => {
      const priorityA = SCHEDULING_CONSTANTS.SHIFT_PRIORITY[getShiftType(a.start_time) as keyof typeof SCHEDULING_CONSTANTS.SHIFT_PRIORITY];
      const priorityB = SCHEDULING_CONSTANTS.SHIFT_PRIORITY[getShiftType(b.start_time) as keyof typeof SCHEDULING_CONSTANTS.SHIFT_PRIORITY];
      return priorityA - priorityB;
    });

    console.log(`Found ${employees.length} total employees`);
    console.log(`Found ${shifts.length} total shifts`);
    console.log(`Found ${availability.length} availability records`);

    for (const shift of sortedShifts) {
      const shiftType = getShiftType(shift.start_time);
      console.log(`\n🔄 Processing ${shift.name} (${shiftType})`);

      const availableEmployees = this.getAvailableEmployees(
        employees,
        shift,
        availability,
        dayOfWeek,
        assignments,
        assignedToday
      );

      console.log(`Found ${availableEmployees.length} available employees for ${shift.name}`);

      if (availableEmployees.length > 0) {
        // Sort employees by weekly hours (ascending) to ensure fair distribution
        availableEmployees.sort((a, b) => {
          const aHours = this.calculateWeeklyHours(a.id, assignments, shift);
          const bHours = this.calculateWeeklyHours(b.id, assignments, shift);
          return aHours - bHours;
        });

        // Assign up to max_employees or all available employees
        const maxToAssign = shift.max_employees || availableEmployees.length;
        for (let i = 0; i < Math.min(maxToAssign, availableEmployees.length); i++) {
          const employee = availableEmployees[i];
          assignments.push({
            schedule_id: scheduleId,
            employee_id: employee.id,
            shift_id: shift.id,
            date: date
          });
          assignedToday.add(employee.id);
          console.log(`✅ Assigned ${employee.id} to ${shift.name}`);
        }
      } else {
        console.log(`❌ No available employees for ${shift.name}`);
      }
    }

    console.log(`\n📊 Total assignments made: ${assignments.length}`);
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
      const hasAvailability = availability.some(avail => {
        if (avail.employee_id !== employee.id || avail.day_of_week !== dayOfWeek) {
          return false;
        }

        // If shift_id is directly specified in availability, use that
        if (avail.shift_id) {
          return avail.shift_id === shift.id;
        }

        // Otherwise check time range overlap
        return this.isTimeWithinAvailability(
          shift.start_time,
          shift.end_time,
          avail.start_time,
          avail.end_time
        );
      });

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
