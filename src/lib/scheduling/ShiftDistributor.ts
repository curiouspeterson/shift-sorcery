import { Employee, Shift, ScheduleAssignment, CoverageStatus } from './types';
import { getShiftType } from '@/utils/shiftTypeUtils';

export class ShiftDistributor {
  private weeklyHours: Map<string, number> = new Map();
  private MAX_WEEKLY_HOURS = 40;
  private MIN_WEEKLY_HOURS = 24;

  public distributeShifts(
    shifts: Shift[],
    employees: Employee[],
    coverage: CoverageStatus,
    scheduleId: string,
    date: string
  ): ScheduleAssignment[] {
    console.log(`\n🔄 Distributing shifts for ${date}`);
    
    const assignments: ScheduleAssignment[] = [];
    const assignedEmployees = new Set<string>();

    // Sort shifts by priority (early shifts first, then by duration)
    const sortedShifts = this.sortShiftsByPriority(shifts);

    for (const shift of sortedShifts) {
      const shiftType = getShiftType(shift.start_time);
      const requiredCount = coverage[shiftType]?.required || 0;
      const currentCount = assignments.filter(
        a => a.shift_id === shift.id
      ).length;

      if (currentCount >= requiredCount) {
        continue;
      }

      // Get available employees for this shift
      const availableEmployees = employees.filter(employee => 
        !assignedEmployees.has(employee.id) &&
        this.canAssignShift(employee, shift)
      );

      // Sort employees by suitability for this shift
      const sortedEmployees = this.sortEmployeesByPriority(
        availableEmployees,
        shift
      );

      // Assign the shift to the most suitable employee
      for (const employee of sortedEmployees) {
        if (currentCount >= requiredCount) break;

        assignments.push({
          schedule_id: scheduleId,
          employee_id: employee.id,
          shift_id: shift.id,
          date: date
        });

        assignedEmployees.add(employee.id);
        this.updateWeeklyHours(employee.id, shift.duration_hours);

        console.log(`✅ Assigned ${employee.first_name} to ${shift.name} on ${date}`);
      }
    }

    return assignments;
  }

  private sortShiftsByPriority(shifts: Shift[]): Shift[] {
    return [...shifts].sort((a, b) => {
      // First sort by shift type priority
      const aType = getShiftType(a.start_time);
      const bType = getShiftType(b.start_time);
      
      const typePriority = {
        'Day Shift Early': 1,
        'Day Shift': 2,
        'Swing Shift': 3,
        'Graveyard': 4
      };

      const priorityDiff = 
        typePriority[aType as keyof typeof typePriority] -
        typePriority[bType as keyof typeof typePriority];

      if (priorityDiff !== 0) return priorityDiff;

      // Then sort by duration (longer shifts first)
      return b.duration_hours - a.duration_hours;
    });
  }

  private sortEmployeesByPriority(
    employees: Employee[],
    shift: Shift
  ): Employee[] {
    return [...employees].sort((a, b) => {
      const aHours = this.weeklyHours.get(a.id) || 0;
      const bHours = this.weeklyHours.get(b.id) || 0;

      // Prioritize employees under minimum hours
      if (aHours < this.MIN_WEEKLY_HOURS && bHours >= this.MIN_WEEKLY_HOURS) {
        return -1;
      }
      if (bHours < this.MIN_WEEKLY_HOURS && aHours >= this.MIN_WEEKLY_HOURS) {
        return 1;
      }

      // Then sort by current weekly hours (less hours = higher priority)
      return aHours - bHours;
    });
  }

  private canAssignShift(employee: Employee, shift: Shift): boolean {
    const currentHours = this.weeklyHours.get(employee.id) || 0;
    return (currentHours + shift.duration_hours) <= Math.min(
      employee.weekly_hours_limit,
      this.MAX_WEEKLY_HOURS
    );
  }

  private updateWeeklyHours(employeeId: string, hours: number): void {
    const currentHours = this.weeklyHours.get(employeeId) || 0;
    this.weeklyHours.set(employeeId, currentHours + hours);
  }
}