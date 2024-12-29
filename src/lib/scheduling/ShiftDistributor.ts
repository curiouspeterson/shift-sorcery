import { Employee, Shift, ScheduleAssignment, EmployeeAvailability } from './types';
import { getShiftType } from '@/utils/shiftUtils';
import { WeeklyHoursTracker } from './WeeklyHoursTracker';

export class ShiftDistributor {
  private weeklyHoursTracker: WeeklyHoursTracker;

  constructor() {
    this.weeklyHoursTracker = new WeeklyHoursTracker();
  }

  public async distributeLongShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[]
  ): Promise<ScheduleAssignment[]> {
    const assignments: ScheduleAssignment[] = [];
    const longShifts = shifts.filter(s => s.duration_hours === 12);
    
    console.log(`📋 Distributing ${longShifts.length} 12-hour shifts`);

    for (const shift of longShifts) {
      const availableEmployees = this.getAvailableEmployees(
        employees,
        shift,
        availability,
        date,
        assignments
      );

      if (availableEmployees.length > 0) {
        const employee = this.selectBestEmployee(availableEmployees, shift);
        assignments.push({
          schedule_id: scheduleId,
          employee_id: employee.id,
          shift_id: shift.id,
          date: date
        });
        
        this.weeklyHoursTracker.addHours(employee.id, shift.duration_hours);
      }
    }

    return assignments;
  }

  public async distributeRegularShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[],
    existingAssignments: ScheduleAssignment[]
  ): Promise<ScheduleAssignment[]> {
    const assignments: ScheduleAssignment[] = [];
    const regularShifts = shifts.filter(s => s.duration_hours === 10);
    
    console.log(`📋 Distributing ${regularShifts.length} 10-hour shifts`);

    for (const shift of regularShifts) {
      const availableEmployees = this.getAvailableEmployees(
        employees,
        shift,
        availability,
        date,
        [...existingAssignments, ...assignments]
      );

      if (availableEmployees.length > 0) {
        const employee = this.selectBestEmployee(availableEmployees, shift);
        assignments.push({
          schedule_id: scheduleId,
          employee_id: employee.id,
          shift_id: shift.id,
          date: date
        });
        
        this.weeklyHoursTracker.addHours(employee.id, shift.duration_hours);
      }
    }

    return assignments;
  }

  public async distributeShortShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[],
    existingAssignments: ScheduleAssignment[]
  ): Promise<ScheduleAssignment[]> {
    const assignments: ScheduleAssignment[] = [];
    const shortShifts = shifts.filter(s => s.duration_hours === 4);
    
    console.log(`📋 Distributing ${shortShifts.length} 4-hour shifts`);

    for (const shift of shortShifts) {
      const availableEmployees = this.getAvailableEmployees(
        employees,
        shift,
        availability,
        date,
        [...existingAssignments, ...assignments]
      );

      if (availableEmployees.length > 0) {
        const employee = this.selectBestEmployee(availableEmployees, shift);
        assignments.push({
          schedule_id: scheduleId,
          employee_id: employee.id,
          shift_id: shift.id,
          date: date
        });
        
        this.weeklyHoursTracker.addHours(employee.id, shift.duration_hours);
      }
    }

    return assignments;
  }

  private getAvailableEmployees(
    employees: Employee[],
    shift: Shift,
    availability: EmployeeAvailability[],
    date: string,
    existingAssignments: ScheduleAssignment[]
  ): Employee[] {
    return employees.filter(employee => {
      // Check if employee is already assigned for this day
      const alreadyAssigned = existingAssignments.some(
        assignment => assignment.employee_id === employee.id
      );
      
      if (alreadyAssigned) {
        return false;
      }

      // Check weekly hours limit
      const currentHours = this.weeklyHoursTracker.getCurrentHours(employee.id);
      if (currentHours + shift.duration_hours > employee.weekly_hours_limit) {
        return false;
      }

      // Check if employee has availability for this shift
      const hasAvailability = availability.some(
        avail =>
          avail.employee_id === employee.id &&
          avail.shift_id === shift.id
      );

      return hasAvailability;
    });
  }

  private selectBestEmployee(employees: Employee[], shift: Shift): Employee {
    // For now, select the employee with the least weekly hours
    return employees.reduce((best, current) => {
      const bestHours = this.weeklyHoursTracker.getCurrentHours(best.id);
      const currentHours = this.weeklyHoursTracker.getCurrentHours(current.id);
      return currentHours < bestHours ? current : best;
    }, employees[0]);
  }
}