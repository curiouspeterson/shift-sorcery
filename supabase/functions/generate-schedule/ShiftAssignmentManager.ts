import { Shift, Employee, Availability, ShiftAssignment } from './types.ts';
import { getShiftType, getShiftDuration } from './ShiftUtils.ts';
import { ShiftRequirementsManager } from './ShiftRequirementsManager.ts';
import { TimeSlotManager } from './TimeSlotManager.ts';
import { ShiftCounter } from './ShiftCounter.ts';

export class ShiftAssignmentManager {
  private assignments: ShiftAssignment[] = [];
  private employeesAssignedToday: Set<string> = new Set();
  private employeeWeeklyHours: Map<string, number> = new Map();
  private timeSlotManager: TimeSlotManager;
  private shiftCounter: ShiftCounter;
  private longShiftCount: number = 0;
  private readonly MAX_LONG_SHIFTS = 3;
  private readonly MAX_WEEKLY_HOURS = 40;

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
      this.shiftCounter.increment(shiftType);
    }
    return true;
  }

  private wouldExceedWeeklyHours(employee: Employee, shift: Shift): boolean {
    const currentHours = this.employeeWeeklyHours.get(employee.id) || 0;
    const shiftHours = getShiftDuration(shift);
    return (currentHours + shiftHours) > this.MAX_WEEKLY_HOURS;
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

    // Check weekly hours limit
    if (this.wouldExceedWeeklyHours(employee, shift)) {
      console.log(`❌ ${employee.first_name} would exceed 40 weekly hours`);
      return false;
    }

    // Check if we've met the minimum requirement for this shift type
    const required = this.requirementsManager.getRequiredStaffForShiftType(shiftType);
    if (this.shiftCounter.getCurrentCount(shiftType) >= required) {
      console.log(`❌ Already at minimum requirement (${required}) for ${shiftType}`);
      return false;
    }

    // Check time slot availability
    if (!this.updateTimeSlotCounts(shift, true)) {
      console.log(`❌ Time slot constraints not met for ${shiftType}`);
      this.updateTimeSlotCounts(shift, false);
      return false;
    }

    // Check shift duration constraints
    const shiftDuration = getShiftDuration(shift);
    if (shiftDuration > 8 && this.longShiftCount >= this.MAX_LONG_SHIFTS) {
      console.log(`❌ Maximum long shifts (${this.MAX_LONG_SHIFTS}) reached`);
      this.updateTimeSlotCounts(shift, false);
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

    // Update weekly hours
    const currentHours = this.employeeWeeklyHours.get(employee.id) || 0;
    this.employeeWeeklyHours.set(employee.id, currentHours + shiftDuration);

    this.assignments.push({
      schedule_id: scheduleId,
      employee_id: employee.id,
      shift_id: shift.id,
      date: date
    });

    this.employeesAssignedToday.add(employee.id);
    
    if (shiftDuration > 8) {
      this.longShiftCount++;
    }

    console.log(`\n=== Assignment details for ${employee.first_name} ===`);
    console.log(`- Shift type: ${shiftType}`);
    console.log(`- Time: ${shift.start_time} - ${shift.end_time}`);
    console.log(`- Duration: ${shiftDuration} hours`);
    console.log(`- Weekly hours: ${this.employeeWeeklyHours.get(employee.id)}`);
    console.log(`- Current ${shiftType} count: ${this.shiftCounter.getCurrentCount(shiftType)}/${this.requirementsManager.getRequiredStaffForShiftType(shiftType)}`);
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

  public areAllRequirementsMet(): boolean {
    const shiftTypes = ["Day Shift Early", "Day Shift", "Swing Shift", "Graveyard"];
    
    for (const shiftType of shiftTypes) {
      const currentCount = this.shiftCounter.getCurrentCount(shiftType);
      const required = this.requirementsManager.getRequiredStaffForShiftType(shiftType);
      
      console.log(`Checking ${shiftType}: ${currentCount}/${required}`);
      
      if (currentCount < required) {
        console.log(`❌ Requirements not met for ${shiftType}`);
        return false;
      }
    }
    
    console.log('✅ All shift requirements met');
    return true;
  }
}