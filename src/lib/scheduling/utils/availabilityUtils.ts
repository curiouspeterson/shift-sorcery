import { Employee, ScheduleAssignment, EmployeeAvailability } from '../types';

export const isTimeWithinAvailability = (
  shiftStart: string,
  shiftEnd: string,
  availStart: string,
  availEnd: string
): boolean => {
  const convertToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const shiftStartMins = convertToMinutes(shiftStart);
  const shiftEndMins = convertToMinutes(shiftEnd);
  const availStartMins = convertToMinutes(availStart);
  const availEndMins = convertToMinutes(availEnd);

  // Handle overnight shifts
  if (availEndMins < availStartMins) {
    return (
      (shiftStartMins >= availStartMins || shiftStartMins <= availEndMins) &&
      (shiftEndMins >= availStartMins || shiftEndMins <= availEndMins)
    );
  }

  return shiftStartMins >= availStartMins && shiftEndMins <= availEndMins;
};

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
      console.log(`Employee ${employee.id} already assigned today`);
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
      console.log(`Employee ${employee.id} not available for this shift`);
    }

    return hasAvailability;
  });
};