import { Employee, Shift, ScheduleAssignment, EmployeeAvailability } from './types';
import { getShiftType } from './ShiftUtils';

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
    // Group assignments by employee to check consecutive days
    const employeeAssignments = new Map<string, string[]>();
    existingAssignments.forEach(assignment => {
      const dates = employeeAssignments.get(assignment.employee_id) || [];
      dates.push(assignment.date);
      employeeAssignments.set(assignment.employee_id, dates);
    });

    return employees.filter(employee => {
      // Check consecutive days worked
      const dates = employeeAssignments.get(employee.id) || [];
      if (dates.length >= 5) {
        console.log(`Employee ${employee.id} has worked 5+ consecutive days`);
        return false;
      }

      return true;
    });
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

    // Sort shifts by priority (peak hours first)
    const sortedShifts = [...shifts].sort((a, b) => {
      // Prioritize peak period shifts
      const aIsPeak = this.isShiftDuringPeakHours(a);
      const bIsPeak = this.isShiftDuringPeakHours(b);
      if (aIsPeak !== bIsPeak) return bIsPeak ? 1 : -1;
      
      // Then sort by required coverage
      return b.max_employees || 0 - (a.max_employees || 0);
    });

    console.log(`Processing ${sortedShifts.length} shifts for ${date}`);

    for (const shift of sortedShifts) {
      const requiredEmployees = shift.max_employees || 1;
      console.log(`Shift ${shift.name} needs ${requiredEmployees} employees`);

      // Get all available employees for this shift
      const availableEmployees = this.getAvailableEmployees(
        employees,
        shift,
        availability,
        dayOfWeek,
        assignments
      );

      console.log(`Found ${availableEmployees.length} available employees for shift`);

      // Assign up to the required number of employees
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
      if (alreadyAssigned) {
        console.log(`Employee ${employee.id} already assigned today`);
        return false;
      }

      // Check if employee has availability for this shift
      const hasAvailability = availability.some(avail => {
        if (avail.employee_id !== employee.id || avail.day_of_week !== dayOfWeek) {
          return false;
        }

        // Handle overnight shifts
        const isOvernight = this.isOvernightShift(shift);
        if (isOvernight) {
          return this.checkOvernightAvailability(avail, shift);
        }

        return this.isTimeWithinAvailability(
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
  }

  private isShiftDuringPeakHours(shift: Shift): boolean {
    const hour = parseInt(shift.start_time.split(':')[0]);
    return hour >= 9 && hour <= 17; // 9 AM - 5 PM considered peak
  }

  private isOvernightShift(shift: Shift): boolean {
    const startHour = parseInt(shift.start_time.split(':')[0]);
    const endHour = parseInt(shift.end_time.split(':')[0]);
    return endHour < startHour;
  }

  private checkOvernightAvailability(
    availability: EmployeeAvailability,
    shift: Shift
  ): boolean {
    // For overnight shifts, employee must be available either:
    // 1. From shift start until midnight
    // 2. From midnight until shift end
    const shiftStartHour = parseInt(shift.start_time.split(':')[0]);
    const availStartHour = parseInt(availability.start_time.split(':')[0]);
    const availEndHour = parseInt(availability.end_time.split(':')[0]);

    return (
      (availStartHour <= shiftStartHour && availEndHour >= 23) || // Available until midnight
      (availStartHour <= 0 && availEndHour >= parseInt(shift.end_time.split(':')[0])) // Available from midnight
    );
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

    // Handle overnight availability
    if (availEndMins < availStartMins) {
      return (
        (shiftStartMins >= availStartMins || shiftStartMins <= availEndMins) &&
        (shiftEndMins >= availStartMins || shiftEndMins <= availEndMins)
      );
    }

    return shiftStartMins >= availStartMins && shiftEndMins <= availEndMins;
  }
}