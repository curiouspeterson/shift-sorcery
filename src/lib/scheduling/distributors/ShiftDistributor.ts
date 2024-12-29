import { Employee, Shift, ScheduleAssignment, EmployeeAvailability } from '../types';
import { getShiftType, isTimeWithinAvailability } from '../../utils/shiftUtils';

export class ShiftDistributor {
  distributeShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[]
  ): ScheduleAssignment[] {
    console.log('📋 Distributing shifts for date:', date);
    const assignments: ScheduleAssignment[] = [];
    const dayOfWeek = new Date(date).getDay();

    // Sort shifts by start time to ensure consistent assignment order
    const sortedShifts = [...shifts].sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    );

    for (const shift of sortedShifts) {
      console.log(`\n🔄 Processing shift: ${shift.name}`);
      const availableEmployees = this.getAvailableEmployees(
        employees,
        shift,
        availability,
        dayOfWeek,
        assignments
      );

      console.log(`Found ${availableEmployees.length} available employees for shift ${shift.name}`);

      if (availableEmployees.length > 0) {
        const maxToAssign = shift.max_employees || 1;
        for (let i = 0; i < Math.min(maxToAssign, availableEmployees.length); i++) {
          const employee = availableEmployees[i];
          assignments.push({
            schedule_id: scheduleId,
            employee_id: employee.id,
            shift_id: shift.id,
            date: date
          });
          console.log(`✅ Assigned ${employee.first_name} ${employee.last_name} to ${shift.name}`);
        }
      } else {
        console.log(`❌ No available employees for shift ${shift.name}`);
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
        console.log(`Employee ${employee.first_name} ${employee.last_name} already assigned today`);
        return false;
      }

      // Check if employee has availability for this shift and day
      const hasAvailability = availability.some(
        avail => {
          if (avail.employee_id !== employee.id || avail.day_of_week !== dayOfWeek) {
            return false;
          }

          // If shift_id is directly specified in availability, use that
          if (avail.shift_id) {
            const matches = avail.shift_id === shift.id;
            if (matches) {
              console.log(`Employee ${employee.first_name} ${employee.last_name} has direct availability for shift ${shift.name}`);
            }
            return matches;
          }

          // Otherwise check time range overlap
          const timeMatches = isTimeWithinAvailability(
            shift.start_time,
            shift.end_time,
            avail.start_time,
            avail.end_time
          );
          
          if (timeMatches) {
            console.log(`Employee ${employee.first_name} ${employee.last_name} has time range availability for shift ${shift.name}`);
          }
          
          return timeMatches;
        }
      );

      if (!hasAvailability) {
        console.log(`Employee ${employee.first_name} ${employee.last_name} has no availability for shift ${shift.name}`);
      }

      return hasAvailability;
    });
  }
}