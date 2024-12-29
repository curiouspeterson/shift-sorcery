import { Employee, Shift, ScheduleAssignment, EmployeeAvailability } from './types.ts';

export class ShiftDistributor {
  distributeShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[]
  ): ScheduleAssignment[] {
    console.log(`\n🔄 Starting shift distribution for date: ${date}`);
    console.log(`Found ${employees.length} employees and ${shifts.length} shifts`);
    
    const assignments: ScheduleAssignment[] = [];
    const dayOfWeek = new Date(date).getDay();
    const assignedEmployees = new Set<string>();

    // Sort shifts by priority (early morning shifts first, then day shifts, etc.)
    const sortedShifts = [...shifts].sort((a, b) => {
      // First sort by max_employees (higher priority for shifts that need more people)
      const maxEmployeesA = a.max_employees || 1;
      const maxEmployeesB = b.max_employees || 1;
      if (maxEmployeesB !== maxEmployeesA) {
        return maxEmployeesB - maxEmployeesA;
      }

      // Then sort by start time
      const timeA = new Date(`2000-01-01T${a.start_time}`).getTime();
      const timeB = new Date(`2000-01-01T${b.start_time}`).getTime();
      return timeA - timeB;
    });

    for (const shift of sortedShifts) {
      console.log(`\n📋 Processing shift: ${shift.name} (${shift.start_time} - ${shift.end_time})`);
      const maxEmployees = shift.max_employees || 1;
      console.log(`Maximum employees needed for this shift: ${maxEmployees}`);
      
      const availableEmployees = this.getAvailableEmployees(
        employees,
        shift,
        availability,
        dayOfWeek,
        assignedEmployees
      );

      console.log(`Found ${availableEmployees.length} available employees for shift ${shift.name}`);

      // Sort employees by their weekly hours (prefer those with fewer hours)
      const sortedEmployees = [...availableEmployees].sort((a, b) => {
        const hoursA = this.getEmployeeAssignedHours(a.id, assignments);
        const hoursB = this.getEmployeeAssignedHours(b.id, assignments);
        return hoursA - hoursB;
      });

      let assignedCount = 0;
      for (const employee of sortedEmployees) {
        if (assignedCount >= maxEmployees) {
          console.log(`✅ Reached maximum employees (${maxEmployees}) for shift ${shift.name}`);
          break;
        }

        // Check if employee would exceed weekly hours limit
        const currentHours = this.getEmployeeAssignedHours(employee.id, assignments);
        const shiftHours = this.calculateShiftHours(shift);
        
        if ((currentHours + shiftHours) > employee.weekly_hours_limit) {
          console.log(`⚠️ Skip ${employee.first_name}: Would exceed weekly hours limit`);
          continue;
        }

        assignments.push({
          schedule_id: scheduleId,
          employee_id: employee.id,
          shift_id: shift.id,
          date: date
        });
        assignedEmployees.add(employee.id);
        assignedCount++;
        
        console.log(`✅ Assigned ${employee.first_name} ${employee.last_name} to ${shift.name}`);
        console.log(`Current weekly hours: ${currentHours + shiftHours}`);
      }

      if (assignedCount < maxEmployees) {
        console.log(`⚠️ Could not fill all positions for ${shift.name} (${assignedCount}/${maxEmployees})`);
      }
    }

    console.log(`\n📊 Total assignments made for ${date}: ${assignments.length}`);
    return assignments;
  }

  private getAvailableEmployees(
    employees: Employee[],
    shift: Shift,
    availability: EmployeeAvailability[],
    dayOfWeek: number,
    assignedEmployees: Set<string>
  ): Employee[] {
    return employees.filter(employee => {
      // Skip if already assigned today
      if (assignedEmployees.has(employee.id)) {
        console.log(`${employee.first_name} ${employee.last_name} already assigned today`);
        return false;
      }

      // Check if employee has availability for this shift and day
      const hasAvailability = availability.some(avail => {
        if (avail.employee_id !== employee.id || avail.day_of_week !== dayOfWeek) {
          return false;
        }

        // If shift_id is directly specified in availability, use that
        if (avail.shift_id) {
          const matches = avail.shift_id === shift.id;
          if (matches) {
            console.log(`${employee.first_name} has direct availability for ${shift.name}`);
          }
          return matches;
        }

        // Otherwise check time range overlap
        const isAvailable = this.isTimeWithinAvailability(
          shift.start_time,
          shift.end_time,
          avail.start_time,
          avail.end_time
        );

        if (isAvailable) {
          console.log(`${employee.first_name} has time range availability for ${shift.name}`);
        }

        return isAvailable;
      });

      if (!hasAvailability) {
        console.log(`${employee.first_name} ${employee.last_name} has no availability for ${shift.name}`);
      }

      return hasAvailability;
    });
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
      // Shift crosses midnight
      return (availEndMins <= availStartMins) || // Availability also crosses midnight
             (shiftStartMins >= availStartMins && availEndMins >= shiftStartMins) || // Start time fits
             (shiftEndMins <= availEndMins && availStartMins <= shiftEndMins); // End time fits
    }

    // Handle overnight availability
    if (availEndMins <= availStartMins) {
      // Availability crosses midnight
      return shiftStartMins >= availStartMins || shiftEndMins <= availEndMins;
    }

    // Regular shift and availability (doesn't cross midnight)
    return shiftStartMins >= availStartMins && shiftEndMins <= availEndMins;
  }

  private calculateShiftHours(shift: Shift): number {
    const start = new Date(`2000-01-01T${shift.start_time}`);
    let end = new Date(`2000-01-01T${shift.end_time}`);
    
    if (end <= start) {
      end = new Date(`2000-01-02T${shift.end_time}`);
    }
    
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  private getEmployeeAssignedHours(
    employeeId: string,
    assignments: ScheduleAssignment[]
  ): number {
    return assignments
      .filter(a => a.employee_id === employeeId)
      .reduce((total, assignment) => total + 8, 0); // Assuming 8-hour shifts for simplicity
  }
}
