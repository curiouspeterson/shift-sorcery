import { Employee, Shift, ScheduleAssignment, EmployeeAvailability } from './types';
import { getShiftType } from '@/utils/shiftUtils';

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

    // Sort shifts by priority - overnight shifts first, then by start time
    const sortedShifts = [...shifts].sort((a, b) => {
      const aStart = this.parseTimeToMinutes(a.start_time);
      const bStart = this.parseTimeToMinutes(b.start_time);
      
      // Prioritize overnight shifts (starts after 8 PM)
      const aIsOvernight = aStart >= 20 * 60; // 8 PM
      const bIsOvernight = bStart >= 20 * 60;
      
      if (aIsOvernight !== bIsOvernight) {
        return aIsOvernight ? -1 : 1;
      }
      
      // Then sort by start time
      return aStart - bStart;
    });

    console.log(`📊 Processing shifts for ${date} in order:`, 
      sortedShifts.map(s => `${s.name} (${s.start_time}-${s.end_time})`));

    for (const shift of sortedShifts) {
      const availableEmployees = this.getAvailableEmployees(
        employees,
        shift,
        availability,
        dayOfWeek,
        assignments
      );

      console.log(`👥 Found ${availableEmployees.length} available employees for ${shift.name}`);

      if (availableEmployees.length > 0) {
        // Sort employees by their weekly hours (ascending) to ensure fair distribution
        const sortedEmployees = [...availableEmployees].sort((a, b) => {
          const aHours = this.getEmployeeWeeklyHours(a.id, assignments) || 0;
          const bHours = this.getEmployeeWeeklyHours(b.id, assignments) || 0;
          return aHours - bHours;
        });

        // Assign the employee with the least hours
        const employee = sortedEmployees[0];
        assignments.push({
          schedule_id: scheduleId,
          employee_id: employee.id,
          shift_id: shift.id,
          date: date
        });

        console.log(`✅ Assigned ${employee.first_name} ${employee.last_name} to ${shift.name}`);
      } else {
        console.log(`⚠️ No available employees for ${shift.name}`);
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
        console.log(`👤 ${employee.first_name} already assigned for this day`);
        return false;
      }

      // Check weekly hours limit
      const currentHours = this.getEmployeeWeeklyHours(employee.id, existingAssignments);
      const shiftHours = this.getShiftHours(shift);
      if (currentHours + shiftHours > employee.weekly_hours_limit) {
        console.log(`👤 ${employee.first_name} would exceed weekly hours limit`);
        return false;
      }

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

      if (!hasAvailability) {
        console.log(`👤 ${employee.first_name} not available for this shift`);
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
    const shiftStartMins = this.parseTimeToMinutes(shiftStart);
    const shiftEndMins = this.parseTimeToMinutes(shiftEnd);
    const availStartMins = this.parseTimeToMinutes(availStart);
    const availEndMins = this.parseTimeToMinutes(availEnd);

    // Handle overnight shifts
    if (shiftEndMins <= shiftStartMins) {
      // Shift crosses midnight
      return (availEndMins <= availStartMins && // Availability also crosses midnight
              shiftStartMins >= availStartMins) || // Start time is within availability
             (availEndMins > availStartMins && // Regular availability
              shiftStartMins >= availStartMins &&
              shiftEndMins <= availEndMins);
    }

    // Regular shift (doesn't cross midnight)
    return shiftStartMins >= availStartMins && shiftEndMins <= availEndMins;
  }

  private parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private getEmployeeWeeklyHours(employeeId: string, assignments: ScheduleAssignment[]): number {
    return assignments
      .filter(a => a.employee_id === employeeId)
      .reduce((total, assignment) => total + this.getShiftHours(assignment), 0);
  }

  private getShiftHours(shift: Shift): number {
    const startMins = this.parseTimeToMinutes(shift.start_time);
    let endMins = this.parseTimeToMinutes(shift.end_time);
    
    if (endMins <= startMins) {
      endMins += 24 * 60; // Add 24 hours for overnight shifts
    }
    
    return (endMins - startMins) / 60;
  }
}