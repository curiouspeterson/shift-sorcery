import { Employee, EmployeeAvailability } from './types.ts';

export class AvailabilityChecker {
  isEmployeeAvailable(
    employee: Employee,
    shift: any,
    availability: EmployeeAvailability[],
    dayOfWeek: number,
    assignedEmployees: Set<string>
  ): boolean {
    console.log(`\n🔍 Checking availability for ${employee.first_name} ${employee.last_name}`);
    
    if (assignedEmployees.has(employee.id)) {
      console.log(`❌ Already assigned today`);
      return false;
    }

    const employeeAvailability = availability.filter(a => 
      a.employee_id === employee.id && 
      a.day_of_week === dayOfWeek
    );

    if (employeeAvailability.length === 0) {
      console.log(`❌ No availability records for day ${dayOfWeek}`);
      return false;
    }

    console.log(`Found ${employeeAvailability.length} availability records`);

    const hasMatchingAvailability = employeeAvailability.some(avail => {
      if (avail.shift_id) {
        const matches = avail.shift_id === shift.id;
        console.log(matches 
          ? `✅ Direct shift match found` 
          : `❌ No direct shift match`
        );
        return matches;
      }

      const isAvailable = this.isTimeWithinAvailability(
        shift.start_time,
        shift.end_time,
        avail.start_time,
        avail.end_time
      );

      console.log(isAvailable
        ? `✅ Time range matches: ${avail.start_time}-${avail.end_time}`
        : `❌ Time range doesn't match: ${avail.start_time}-${avail.end_time}`
      );

      return isAvailable;
    });

    return hasMatchingAvailability;
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