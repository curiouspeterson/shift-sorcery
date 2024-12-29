import { Employee, Shift, ScheduleAssignment, EmployeeAvailability } from './types.ts';
import { getShiftType } from './ShiftUtils.ts';

export class ShiftDistributor {
  distributeShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[]
  ): ScheduleAssignment[] {
    const assignments: ScheduleAssignment[] = [];
    const dayOfWeek = new Date(date).getDay();

    // Sort shifts by start time to ensure consistent assignment order
    const sortedShifts = [...shifts].sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    );

    for (const shift of sortedShifts) {
      const availableEmployees = this.getAvailableEmployees(
        employees,
        shift,
        availability,
        dayOfWeek,
        assignments
      );

      if (availableEmployees.length > 0) {
        // For now, assign the first available employee
        // This can be enhanced with more sophisticated selection logic
        const employee = availableEmployees[0];
        assignments.push({
          schedule_id: scheduleId,
          employee_id: employee.id,
          shift_id: shift.id,
          date: date
        });
      }
    }

    return assignments;
  }

  private getAvailableEmployees(
    employees: Employee[],
    shift: Shift,
    availability: EmployeeAvailability[],
    dayOfWeek: number,
    existingAssignments: ScheduleAssignment[]
  ): Employee[] {
    return employees.filter(employee => {
      // Check if employee is already assigned for this day
      const alreadyAssigned = existingAssignments.some(
        assignment => assignment.employee_id === employee.id
      );
      if (alreadyAssigned) return false;

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

      return hasAvailability;
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

    return shiftStartMins >= availStartMins && shiftEndMins <= availEndMins;
  }
}