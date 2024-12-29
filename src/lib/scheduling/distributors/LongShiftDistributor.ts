import { Employee, Shift, ScheduleAssignment, EmployeeAvailability } from '../types';
import { filterAvailableEmployees } from '../utils/availabilityUtils';

export class LongShiftDistributor {
  distributeShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[]
  ): ScheduleAssignment[] {
    console.log('📋 Distributing long shifts for date:', date);
    const longShifts = shifts.filter(shift => shift.duration_hours >= 12);
    return this.assignShifts(date, scheduleId, employees, longShifts, availability);
  }

  private assignShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[]
  ): ScheduleAssignment[] {
    const assignments: ScheduleAssignment[] = [];
    const dayOfWeek = new Date(date).getDay();

    for (const shift of shifts) {
      const availableEmployees = filterAvailableEmployees(
        employees,
        shift,
        availability,
        dayOfWeek,
        assignments
      );

      const requiredEmployees = shift.max_employees || 1;
      console.log(`Shift ${shift.name} needs ${requiredEmployees} employees`);

      for (let i = 0; i < Math.min(requiredEmployees, availableEmployees.length); i++) {
        const employee = availableEmployees[i];
        assignments.push({
          schedule_id: scheduleId,
          employee_id: employee.id,
          shift_id: shift.id,
          date: date
        });
        console.log(`Assigned ${employee.id} to ${shift.name}`);
      }
    }

    return assignments;
  }
}