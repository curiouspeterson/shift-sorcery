import { Shift, Employee, Availability, ShiftAssignment } from './types.ts';
import { getShiftType, getShiftDuration } from './shiftUtils.ts';
import { ShiftRequirementsManager } from './ShiftRequirementsManager.ts';

export class ShiftAssignmentManager {
  private assignments: ShiftAssignment[] = [];
  private employeesAssignedToday: Set<string> = new Set();
  private shiftCounts: Record<string, number> = {
    'Day Shift Early': 0,
    'Day Shift': 0,
    'Swing Shift': 0,
    'Graveyard': 0
  };
  private longShiftCount: number = 0;
  private readonly MAX_LONG_SHIFTS = 3;

  constructor(private requirementsManager: ShiftRequirementsManager) {}

  public resetDailyCounts(): void {
    this.employeesAssignedToday.clear();
    this.shiftCounts = {
      'Day Shift Early': 0,
      'Day Shift': 0,
      'Swing Shift': 0,
      'Graveyard': 0
    };
    this.longShiftCount = 0;
  }

  public canAssignShift(
    employee: Employee,
    shift: Shift,
    availability: Availability[],
    dayOfWeek: number
  ): boolean {
    // Check if employee is already assigned today
    if (this.employeesAssignedToday.has(employee.id)) {
      return false;
    }

    const shiftType = getShiftType(shift.start_time);
    const shiftDuration = getShiftDuration(shift);
    const required = this.requirementsManager.getRequiredStaffForShiftType(shiftType);

    // Check if we've reached the maximum for this shift type
    if (this.shiftCounts[shiftType] >= required) {
      return false;
    }

    // Check if we can assign a long shift
    if (shiftDuration > 8 && this.longShiftCount >= this.MAX_LONG_SHIFTS) {
      return false;
    }

    // Check employee availability
    const hasAvailability = availability.some(a => 
      a.employee_id === employee.id && 
      a.day_of_week === dayOfWeek &&
      a.shift_id === shift.id
    );

    return hasAvailability;
  }

  public assignShift(
    scheduleId: string,
    employee: Employee,
    shift: Shift,
    date: string
  ): void {
    const shiftType = getShiftType(shift.start_time);
    const shiftDuration = getShiftDuration(shift);

    this.assignments.push({
      schedule_id: scheduleId,
      employee_id: employee.id,
      shift_id: shift.id,
      date: date
    });

    this.employeesAssignedToday.add(employee.id);
    this.shiftCounts[shiftType]++;
    
    if (shiftDuration > 8) {
      this.longShiftCount++;
    }

    console.log(`Assigned ${employee.first_name} to ${shiftType} (${shift.start_time} - ${shift.end_time})`);
  }

  public getAssignments(): ShiftAssignment[] {
    return [...this.assignments];
  }

  public getCurrentCounts(): Record<string, number> {
    return { ...this.shiftCounts };
  }
}