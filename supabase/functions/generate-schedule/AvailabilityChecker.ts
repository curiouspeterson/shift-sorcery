import { Employee, EmployeeAvailability } from './types.ts';

export class AvailabilityChecker {
  isEmployeeAvailable(
    employee: Employee,
    shift: any,
    availability: EmployeeAvailability[],
    dayOfWeek: number,
    assignedEmployees: Set<string>
  ): boolean {
    if (assignedEmployees.has(employee.id)) {
      console.log(`👤 ${employee.first_name}: Already assigned today`);
      return false;
    }

    const hasAvailability = availability.some(avail => {
      if (avail.employee_id !== employee.id || avail.day_of_week !== dayOfWeek) {
        return false;
      }

      if (avail.shift_id) {
        const matches = avail.shift_id === shift.id;
        if (matches) {
          console.log(`👍 ${employee.first_name}: Has direct availability for ${shift.name}`);
        }
        return matches;
      }

      const isAvailable = this.isTimeWithinAvailability(
        shift.start_time,
        shift.end_time,
        avail.start_time,
        avail.end_time
      );

      if (isAvailable) {
        console.log(`👍 ${employee.first_name}: Has time range availability for ${shift.name}`);
      }

      return isAvailable;
    });

    if (!hasAvailability) {
      console.log(`👎 ${employee.first_name}: No availability for ${shift.name}`);
    }

    return hasAvailability;
  }

  private isTimeWithinAvailability(
    shiftStart: string,
    shiftEnd: string,
    availStart: string,
    availEnd: string
  ): boolean {
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
      return (availEndMins <= availStartMins) ||
             (shiftStartMins >= availStartMins && availEndMins >= shiftStartMins) ||
             (shiftEndMins <= availEndMins && availStartMins <= shiftEndMins);
    }

    // Handle overnight availability
    if (availEndMins <= availStartMins) {
      return shiftStartMins >= availStartMins || shiftEndMins <= availEndMins;
    }

    return shiftStartMins >= availStartMins && shiftEndMins <= availEndMins;
  }
}