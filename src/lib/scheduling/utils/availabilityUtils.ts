import { Employee, ScheduleAssignment, EmployeeAvailability } from '../types';
import { isTimeWithinAvailability } from './shiftUtils';

export const filterAvailableEmployees = (
  employees: Employee[],
  shift: any,
  availability: EmployeeAvailability[],
  dayOfWeek: number,
  existingAssignments: ScheduleAssignment[]
): Employee[] => {
  return employees.filter(employee => {
    // Check if employee is already assigned for this day
    const alreadyAssigned = existingAssignments.some(
      assignment => assignment.employee_id === employee.id
    );
    if (alreadyAssigned) {
      console.log(`${employee.first_name} ${employee.last_name} already assigned today`);
      return false;
    }

    // Check if employee has availability for this shift
    const hasAvailability = availability.some(avail => {
      if (avail.employee_id !== employee.id || avail.day_of_week !== dayOfWeek) {
        return false;
      }

      return isTimeWithinAvailability(
        shift.start_time,
        shift.end_time,
        avail.start_time,
        avail.end_time
      );
    });

    if (!hasAvailability) {
      console.log(`${employee.first_name} ${employee.last_name} has no availability for shift ${shift.name}`);
    }

    return hasAvailability;
  });
};