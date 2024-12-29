import { Employee, Shift, ScheduleAssignment, EmployeeAvailability } from './types';
import { getShiftType } from '@/utils/shiftUtils';

export class ShiftDistributor {
  async distributeLongShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[]
  ): Promise<ScheduleAssignment[]> {
    console.log('📋 Distributing long shifts for date:', date);
    const longShifts = shifts.filter(shift => shift.duration_hours >= 12);
    return this.distributeShifts(date, scheduleId, employees, longShifts, availability);
  }

  async distributeRegularShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[],
    existingAssignments: ScheduleAssignment[]
  ): Promise<ScheduleAssignment[]> {
    console.log('📋 Distributing regular shifts for date:', date);
    const regularShifts = shifts.filter(shift => 
      shift.duration_hours >= 8 && shift.duration_hours < 12
    );
    const availableEmployees = this.filterAvailableEmployees(
      employees,
      existingAssignments
    );
    return this.distributeShifts(date, scheduleId, availableEmployees, regularShifts, availability);
  }

  async distributeShortShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[],
    existingAssignments: ScheduleAssignment[]
  ): Promise<ScheduleAssignment[]> {
    console.log('📋 Distributing short shifts for date:', date);
    const shortShifts = shifts.filter(shift => shift.duration_hours < 8);
    const availableEmployees = this.filterAvailableEmployees(
      employees,
      existingAssignments
    );
    return this.distributeShifts(date, scheduleId, availableEmployees, shortShifts, availability);
  }

  private filterAvailableEmployees(
    employees: Employee[],
    existingAssignments: ScheduleAssignment[]
  ): Employee[] {
    return employees.filter(employee => 
      !existingAssignments.some(assignment => 
        assignment.employee_id === employee.id
      )
    );
  }

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
          avail.shift_id === shift.id
      );

      return hasAvailability;
    });
  }
}