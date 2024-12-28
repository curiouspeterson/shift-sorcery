import { Shift, Employee, Availability, ShiftAssignment } from './types.ts';
import { getShiftType, getShiftDuration } from './ShiftUtils.ts';
import { ShiftRequirementsManager } from './ShiftRequirementsManager.ts';
import { TimeSlotManager } from './TimeSlotManager.ts';
import { ShiftCounter } from './ShiftCounter.ts';
import { WeeklyHoursTracker } from './WeeklyHoursTracker.ts';
import { DailyAssignmentTracker } from './DailyAssignmentTracker.ts';
import { AssignmentStorage } from './AssignmentStorage.ts';

export class ShiftAssignmentManager {
  private timeSlotManager: TimeSlotManager;
  private shiftCounter: ShiftCounter;
  private weeklyHoursTracker: WeeklyHoursTracker;
  private dailyTracker: DailyAssignmentTracker;
  private assignmentStorage: AssignmentStorage;

  constructor(private requirementsManager: ShiftRequirementsManager) {
    this.timeSlotManager = new TimeSlotManager();
    this.shiftCounter = new ShiftCounter();
    this.weeklyHoursTracker = new WeeklyHoursTracker();
    this.dailyTracker = new DailyAssignmentTracker();
    this.assignmentStorage = new AssignmentStorage();
  }

  public resetDailyCounts(): void {
    console.log('\n=== Resetting daily counts ===');
    this.dailyTracker.reset();
    this.shiftCounter.reset();
    this.timeSlotManager.resetCounts();
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

    if (increment && this.shiftCounter.getCurrentCount(shiftType) >= required) {
      console.log(`❌ Cannot assign: ${shiftType} already at minimum requirement (${this.shiftCounter.getCurrentCount(shiftType)}/${required})`);
      return false;
    }

    if (increment && !this.timeSlotManager.canAddToTimeSlots(timeSlots, required)) {
      return false;
    }

    this.timeSlotManager.updateTimeSlots(timeSlots, increment);

    if (increment) {
      console.log(`✅ Assignment allowed for ${shiftType}`);
      this.shiftCounter.increment(shiftType);
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

    if (this.dailyTracker.isEmployeeAssignedToday(employee.id)) {
      console.log(`❌ ${employee.first_name} already assigned today`);
      return false;
    }

    const shiftDuration = getShiftDuration(shift);
    if (this.weeklyHoursTracker.wouldExceedWeeklyHours(employee.id, shiftDuration)) {
      console.log(`❌ ${employee.first_name} would exceed 40 weekly hours`);
      return false;
    }

    const required = this.requirementsManager.getRequiredStaffForShiftType(shiftType);
    if (this.shiftCounter.getCurrentCount(shiftType) >= required) {
      console.log(`❌ Already at minimum requirement (${required}) for ${shiftType}`);
      return false;
    }

    if (!this.updateTimeSlotCounts(shift, true)) {
      console.log(`❌ Time slot constraints not met for ${shiftType}`);
      this.updateTimeSlotCounts(shift, false);
      return false;
    }

    if (shiftDuration > 8 && !this.dailyTracker.canAddLongShift()) {
      console.log(`❌ Maximum long shifts reached`);
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

    this.weeklyHoursTracker.addHours(employee.id, shiftDuration);
    
    this.assignmentStorage.addAssignment({
      schedule_id: scheduleId,
      employee_id: employee.id,
      shift_id: shift.id,
      date: date
    });

    this.dailyTracker.addAssignment(employee.id, shiftDuration > 8);

    console.log(`\n=== Assignment details for ${employee.first_name} ===`);
    console.log(`- Shift type: ${shiftType}`);
    console.log(`- Time: ${shift.start_time} - ${shift.end_time}`);
    console.log(`- Duration: ${shiftDuration} hours`);
    console.log(`- Weekly hours: ${this.weeklyHoursTracker.getCurrentHours(employee.id)}`);
    console.log(`- Current ${shiftType} count: ${this.shiftCounter.getCurrentCount(shiftType)}/${this.requirementsManager.getRequiredStaffForShiftType(shiftType)}`);
    console.log(`- Long shifts assigned: ${this.dailyTracker.getCurrentLongShiftCount()}`);
  }

  public getAssignments(): ShiftAssignment[] {
    return this.assignmentStorage.getAssignments();
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