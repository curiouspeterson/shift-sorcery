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
    console.log('\n=== Resetting daily counts ===');
    this.employeesAssignedToday.clear();
    this.shiftCounts = {
      'Day Shift Early': 0,
      'Day Shift': 0,
      'Swing Shift': 0,
      'Graveyard': 0
    };
    this.employeesPerTimeSlot.clear();
    this.longShiftCount = 0;
    console.log('Daily counts reset complete');
  }

  private updateTimeSlotCounts(shift: Shift, increment: boolean = true): boolean {
    const timeSlots = this.getTimeSlots(shift);
    const delta = increment ? 1 : -1;
    const shiftType = getShiftType(shift.start_time);
    const required = this.requirementsManager.getRequiredStaffForShiftType(shiftType);

    console.log(`\nChecking time slot capacity for ${shiftType}:`);
    console.log(`Current count: ${this.shiftCounts[shiftType]}, Required: ${required}`);

    // Strict enforcement: Do not allow exceeding minimum requirements
    if (increment && this.shiftCounts[shiftType] >= required) {
      console.log(`❌ Cannot assign: ${shiftType} already at required capacity (${this.shiftCounts[shiftType]}/${required})`);
      return false;
    }

    // Check if adding this shift would exceed capacity in any time slot
    if (increment) {
      for (const slot of timeSlots) {
        const currentCount = this.employeesPerTimeSlot.get(slot) || 0;
        const maxForSlot = Math.min(SCHEDULING_CONSTANTS.MAX_EMPLOYEES_PER_SHIFT, required);
        
        if (currentCount + delta > maxForSlot) {
          console.log(`❌ Cannot assign: would exceed max capacity (${maxForSlot}) at ${slot}`);
          return false;
        }
      }
    }

    // Update counts for all time slots
    for (const slot of timeSlots) {
      const currentCount = this.employeesPerTimeSlot.get(slot) || 0;
      this.employeesPerTimeSlot.set(slot, currentCount + delta);
    }

    if (increment) {
      console.log(`✅ Assignment allowed for ${shiftType}`);
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
    const shiftType = getShiftType(shift.start_time);
    console.log(`\nChecking if ${employee.first_name} can be assigned to ${shiftType}:`);

    // Check if employee is already assigned today
    if (this.employeesAssignedToday.has(employee.id)) {
      console.log(`❌ ${employee.first_name} already assigned today`);
      return false;
    }

    // Strict enforcement: Check against minimum requirements
    const required = this.requirementsManager.getRequiredStaffForShiftType(shiftType);
    if (this.shiftCounts[shiftType] >= required) {
      console.log(`❌ Already met minimum requirement (${required}) for ${shiftType}`);
      return false;
    }

    // Check capacity constraints
    if (!this.updateTimeSlotCounts(shift, true)) {
      console.log(`❌ Capacity constraints not met for ${shiftType}`);
      this.updateTimeSlotCounts(shift, false); // Rollback the count
      return false;
    }

    const shiftDuration = getShiftDuration(shift);
    
    // Check if we can assign a long shift
    if (shiftDuration > 8 && this.longShiftCount >= this.MAX_LONG_SHIFTS) {
      console.log(`❌ Maximum long shifts (${this.MAX_LONG_SHIFTS}) reached`);
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
      console.log(`❌ ${employee.first_name} not available for this shift`);
      this.updateTimeSlotCounts(shift, false); // Rollback the count
      return false;
    }

    console.log(`✅ ${employee.first_name} can be assigned to ${shiftType}`);
    return true;
  }

  public assignShift(
    scheduleId: string,
    employee: Employee,
    shift: Shift,
    date: string
  ): void {
    const shiftType = getShiftType(shift.start_time);
    const shiftDuration = getShiftDuration(shift);
    const required = this.requirementsManager.getRequiredStaffForShiftType(shiftType);

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

    console.log(`\n=== Assignment details for ${employee.first_name} ===`);
    console.log(`- Shift type: ${shiftType}`);
    console.log(`- Time: ${shift.start_time} - ${shift.end_time}`);
    console.log(`- Duration: ${shiftDuration} hours`);
    console.log(`- Current ${shiftType} count: ${this.shiftCounts[shiftType]}/${required}`);
    console.log(`- Long shifts assigned: ${this.longShiftCount}/${this.MAX_LONG_SHIFTS}`);
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