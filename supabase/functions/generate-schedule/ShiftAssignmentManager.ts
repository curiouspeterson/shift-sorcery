import { Shift, Employee, Availability, ShiftAssignment } from './types.ts';
import { getShiftType, getShiftDuration } from './ShiftUtils.ts';
import { ShiftRequirementsManager } from './ShiftRequirementsManager.ts';
import { TimeSlotManager } from './TimeSlotManager.ts';
import { ShiftCounter } from './ShiftCounter.ts';

export class ShiftAssignmentManager {
  private assignments: ShiftAssignment[] = [];
  private employeesAssignedToday: Set<string> = new Set();
  private timeSlotManager: TimeSlotManager;
  private shiftCounter: ShiftCounter;
  private longShiftCount: number = 0;
  private readonly MAX_LONG_SHIFTS = 3;

  constructor(private requirementsManager: ShiftRequirementsManager) {
    this.timeSlotManager = new TimeSlotManager();
    this.shiftCounter = new ShiftCounter();
  }

  public resetDailyCounts(): void {
    console.log('\n=== Resetting daily counts ===');
    this.employeesAssignedToday.clear();
    this.shiftCounter.reset();
    this.timeSlotManager.resetCounts();
    this.longShiftCount = 0;
    console.log('Daily counts reset complete');
  }

  private getTimeSlots(shift: Shift): string[] {
    const slots: string[] = [];
    let startHour = parseInt(shift.start_time.split(':')[0]);
    let endHour = parseInt(shift.end_time.split(':')[0]);

    if (endHour <= startHour) {
      endHour += 24;
    }

    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour % 24}:00`);
    }

    return slots;
  }

  private updateTimeSlotCounts(shift: Shift, increment: boolean = true): boolean {
    const timeSlots = this.getTimeSlots(shift);
    const shiftType = getShiftType(shift.start_time);
    const required = this.requirementsManager.getRequiredStaffForShiftType(shiftType);

    console.log(`\nChecking time slot capacity for ${shiftType}:`);
    console.log(`Current count: ${this.shiftCounter.getCurrentCount(shiftType)}, Required: ${required}`);

    // Strict enforcement: Never exceed minimum requirements
    if (increment && this.shiftCounter.getCurrentCount(shiftType) >= required) {
      console.log(`❌ Cannot assign: ${shiftType} already at minimum requirement (${this.shiftCounter.getCurrentCount(shiftType)}/${required})`);
      return false;
    }

    // Check capacity constraints
    if (increment && !this.timeSlotManager.canAddToTimeSlots(timeSlots, required)) {
      return false;
    }

    // Update time slot counts
    this.timeSlotManager.updateTimeSlots(timeSlots, increment);

    if (increment) {
      console.log(`✅ Assignment allowed for ${shiftType}`);
    }
    return true;
  }

  public canAssignShift(
    employee: Employee,
    shift: Shift,
    availability: Availability[],
    dayOfWeek: number
  ): boolean {
    const shiftType = getShiftType(shift.start_time);
    console.log(`\nChecking if ${employee.first_name} can be assigned to ${shiftType}:`);

    if (this.employeesAssignedToday.has(employee.id)) {
      console.log(`❌ ${employee.first_name} already assigned today`);
      return false;
    }

    const required = this.requirementsManager.getRequiredStaffForShiftType(shiftType);
    if (this.shiftCounter.getCurrentCount(shiftType) >= required) {
      console.log(`❌ Already at minimum requirement (${required}) for ${shiftType}`);
      return false;
    }

    if (!this.updateTimeSlotCounts(shift, true)) {
      console.log(`❌ Capacity constraints not met for ${shiftType}`);
      this.updateTimeSlotCounts(shift, false);
      return false;
    }

    const shiftDuration = getShiftDuration(shift);
    if (shiftDuration > 8 && this.longShiftCount >= this.MAX_LONG_SHIFTS) {
      console.log(`❌ Maximum long shifts (${this.MAX_LONG_SHIFTS}) reached`);
      this.updateTimeSlotCounts(shift, false);
      return false;
    }

    const hasAvailability = availability.some(a => 
      a.employee_id === employee.id && 
      a.day_of_week === dayOfWeek &&
      a.shift_id === shift.id
    );

    if (!hasAvailability) {
      console.log(`❌ ${employee.first_name} not available for this shift`);
      this.updateTimeSlotCounts(shift, false);
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
    this.shiftCounter.increment(shiftType);
    
    if (shiftDuration > 8) {
      this.longShiftCount++;
    }

    console.log(`\n=== Assignment details for ${employee.first_name} ===`);
    console.log(`- Shift type: ${shiftType}`);
    console.log(`- Time: ${shift.start_time} - ${shift.end_time}`);
    console.log(`- Duration: ${shiftDuration} hours`);
    console.log(`- Current ${shiftType} count: ${this.shiftCounter.getCurrentCount(shiftType)}/${required}`);
    console.log(`- Long shifts assigned: ${this.longShiftCount}/${this.MAX_LONG_SHIFTS}`);
  }

  public getAssignments(): ShiftAssignment[] {
    return [...this.assignments];
  }

  public getCurrentCounts(): Record<string, number> {
    return this.shiftCounter.getCounts();
  }

  public getCapacityInfo(): string {
    return this.timeSlotManager.getCapacityInfo();
  }
}