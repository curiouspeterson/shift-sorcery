import { Shift, Employee, Availability, ShiftAssignment } from './types.ts';
import { getShiftType, getShiftDuration } from './shiftUtils.ts';
import { ShiftRequirementsManager } from './ShiftRequirementsManager.ts';
import { SCHEDULING_CONSTANTS } from './constants.ts';

export class ShiftAssignmentManager {
  private assignments: ShiftAssignment[] = [];
  private employeesAssignedToday: Set<string> = new Set();
  private shiftCounts: Record<string, number> = {
    'Day Shift Early': 0,
    'Day Shift': 0,
    'Swing Shift': 0,
    'Graveyard': 0
  };
  private employeesPerTimeSlot: Map<string, number> = new Map();
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
    this.employeesPerTimeSlot.clear();
    this.longShiftCount = 0;
  }

  private updateTimeSlotCounts(shift: Shift, increment: boolean = true): boolean {
    const timeSlots = this.getTimeSlots(shift);
    const delta = increment ? 1 : -1;

    // Check if adding this shift would exceed capacity in any time slot
    if (increment) {
      for (const slot of timeSlots) {
        const currentCount = this.employeesPerTimeSlot.get(slot) || 0;
        if (currentCount + delta > SCHEDULING_CONSTANTS.MAX_EMPLOYEES_PER_SHIFT) {
          console.log(`Cannot assign shift: would exceed max capacity (${SCHEDULING_CONSTANTS.MAX_EMPLOYEES_PER_SHIFT}) at ${slot}`);
          return false;
        }
      }
    }

    // Update counts for all time slots
    for (const slot of timeSlots) {
      const currentCount = this.employeesPerTimeSlot.get(slot) || 0;
      this.employeesPerTimeSlot.set(slot, currentCount + delta);
    }

    return true;
  }

  private getTimeSlots(shift: Shift): string[] {
    const slots: string[] = [];
    let startHour = parseInt(shift.start_time.split(':')[0]);
    let endHour = parseInt(shift.end_time.split(':')[0]);

    // Handle overnight shifts
    if (endHour <= startHour) {
      endHour += 24;
    }

    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour % 24}:00`);
    }

    return slots;
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

    // Check capacity constraints
    if (!this.updateTimeSlotCounts(shift, true)) {
      this.updateTimeSlotCounts(shift, false); // Rollback the count
      return false;
    }

    const shiftType = getShiftType(shift.start_time);
    const shiftDuration = getShiftDuration(shift);
    const required = this.requirementsManager.getRequiredStaffForShiftType(shiftType);

    // Check if we've reached the maximum for this shift type
    if (this.shiftCounts[shiftType] >= required) {
      this.updateTimeSlotCounts(shift, false); // Rollback the count
      return false;
    }

    // Check if we can assign a long shift
    if (shiftDuration > 8 && this.longShiftCount >= this.MAX_LONG_SHIFTS) {
      this.updateTimeSlotCounts(shift, false); // Rollback the count
      return false;
    }

    // Check employee availability
    const hasAvailability = availability.some(a => 
      a.employee_id === employee.id && 
      a.day_of_week === dayOfWeek &&
      a.shift_id === shift.id
    );

    if (!hasAvailability) {
      this.updateTimeSlotCounts(shift, false); // Rollback the count
    }

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

    // Log the assignment and current capacity
    const timeSlots = this.getTimeSlots(shift);
    const capacityInfo = timeSlots.map(slot => 
      `${slot}: ${this.employeesPerTimeSlot.get(slot) || 0}/${SCHEDULING_CONSTANTS.MAX_EMPLOYEES_PER_SHIFT}`
    ).join(', ');

    console.log(`Assigned ${employee.first_name} to ${shiftType} (${shift.start_time} - ${shift.end_time})`);
    console.log(`Current capacity: ${capacityInfo}`);
  }

  public getAssignments(): ShiftAssignment[] {
    return [...this.assignments];
  }

  public getCurrentCounts(): Record<string, number> {
    return { ...this.shiftCounts };
  }

  public getCapacityInfo(): string {
    return Array.from(this.employeesPerTimeSlot.entries())
      .map(([slot, count]) => `${slot}: ${count}/${SCHEDULING_CONSTANTS.MAX_EMPLOYEES_PER_SHIFT}`)
      .join('\n');
  }
}