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
    console.log('Available employees:', employees.map(e => `${e.first_name} (${e.weekly_hours_limit}h limit)`));
    
    const assignments: ScheduleAssignment[] = [];
    const dayOfWeek = new Date(date).getDay();
    const assignedEmployees = new Set<string>();

    // Sort shifts by priority
    const sortedShifts = [...shifts].sort((a, b) => {
      const maxEmployeesA = a.max_employees || 1;
      const maxEmployeesB = b.max_employees || 1;
      if (maxEmployeesB !== maxEmployeesA) {
        return maxEmployeesB - maxEmployeesA;
      }

      const timeA = new Date(`2000-01-01T${a.start_time}`).getTime();
      const timeB = new Date(`2000-01-01T${b.start_time}`).getTime();
      return timeA - timeB;
    });

    console.log('\n📋 Shifts to process:', sortedShifts.map(s => 
      `${s.name} (${s.start_time}-${s.end_time}, needs ${s.max_employees || 1} employees)`
    ));

    for (const shift of sortedShifts) {
      console.log(`\n🔍 Processing shift: ${shift.name}`);
      console.log(`Time: ${shift.start_time} - ${shift.end_time}`);
      console.log(`Required employees: ${shift.max_employees || 1}`);
      
      const availableEmployees = this.getAvailableEmployees(
        employees,
        shift,
        availability,
        dayOfWeek,
        assignedEmployees
      );

      console.log(`\n👥 Found ${availableEmployees.length} available employees for shift ${shift.name}`);

      // Sort employees by their weekly hours (prefer those with fewer hours)
      const sortedEmployees = [...availableEmployees].sort((a, b) => {
        const hoursA = this.getEmployeeAssignedHours(a.id, assignments);
        const hoursB = this.getEmployeeAssignedHours(b.id, assignments);
        return hoursA - hoursB;
      });

      console.log('\n📊 Employee hours status:');
      sortedEmployees.forEach(emp => {
        const currentHours = this.getEmployeeAssignedHours(emp.id, assignments);
        console.log(`${emp.first_name}: ${currentHours}h / ${emp.weekly_hours_limit}h limit`);
      });

      const maxEmployees = shift.max_employees || 1;
      let assignedCount = 0;

      for (const employee of sortedEmployees) {
        if (assignedCount >= maxEmployees) {
          console.log(`\n✋ Reached maximum employees (${maxEmployees}) for shift ${shift.name}`);
          break;
        }

        const currentHours = this.getEmployeeAssignedHours(employee.id, assignments);
        const shiftHours = this.calculateShiftHours(shift);
        
        console.log(`\n🧮 Evaluating ${employee.first_name} for ${shift.name}:`);
        console.log(`Current hours: ${currentHours}h`);
        console.log(`Shift duration: ${shiftHours}h`);
        console.log(`Weekly limit: ${employee.weekly_hours_limit}h`);
        
        if ((currentHours + shiftHours) > employee.weekly_hours_limit) {
          console.log(`❌ Skip: Would exceed weekly hours limit (${currentHours + shiftHours}h > ${employee.weekly_hours_limit}h)`);
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
        
        console.log(`✅ Assigned ${employee.first_name} to ${shift.name}`);
        console.log(`New weekly hours: ${currentHours + shiftHours}h`);
      }

      if (assignedCount < maxEmployees) {
        console.log(`\n⚠️ Warning: Could not fill all positions for ${shift.name}`);
        console.log(`Assigned: ${assignedCount}/${maxEmployees} employees`);
      }
    }

    console.log(`\n📊 Final assignments for ${date}:`, assignments.length);
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
      if (assignedEmployees.has(employee.id)) {
        console.log(`\n👤 ${employee.first_name}: Already assigned today`);
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

    if (shiftEndMins <= shiftStartMins) {
      return (availEndMins <= availStartMins) ||
             (shiftStartMins >= availStartMins && availEndMins >= shiftStartMins) ||
             (shiftEndMins <= availEndMins && availStartMins <= shiftEndMins);
    }

    if (availEndMins <= availStartMins) {
      return shiftStartMins >= availStartMins || shiftEndMins <= availEndMins;
    }

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
      .reduce((total, assignment) => total + 8, 0);
  }
}