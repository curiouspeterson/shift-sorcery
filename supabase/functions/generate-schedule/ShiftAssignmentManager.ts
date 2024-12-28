import { Shift, Employee, Availability, ShiftAssignment } from './types.ts';
import { getShiftType, getShiftDuration } from './ShiftUtils.ts';
import { ShiftRequirementsManager } from './ShiftRequirementsManager.ts';
import { TimeSlotManager } from './TimeSlotManager.ts';
import { ShiftCounter } from './ShiftCounter.ts';
import { WeeklyHoursTracker } from './WeeklyHoursTracker.ts';
import { DailyAssignmentTracker } from './DailyAssignmentTracker.ts';
import { AssignmentStorage } from './AssignmentStorage.ts';
import { SCHEDULING_CONSTANTS } from './constants.ts';

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

  public getWeeklyHoursTracker(): WeeklyHoursTracker {
    return this.weeklyHoursTracker;
  }

  public getEmployeeWeeklyHours(employeeId: string): number {
    return this.weeklyHoursTracker.getCurrentHours(employeeId);
  }

  public isEmployeeAssignedToday(employeeId: string): boolean {
    return this.dailyTracker.isEmployeeAssignedToday(employeeId);
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
    this.dailyTracker.addAssignment(employee.id);
    this.shiftCounter.increment(shiftType);
    
    this.assignmentStorage.addAssignment({
      schedule_id: scheduleId,
      employee_id: employee.id,
      shift_id: shift.id,
      date: date
    });

    console.log(`\n=== Assignment details for ${employee.first_name} ===`);
    console.log(`- Shift type: ${shiftType}`);
    console.log(`- Time: ${shift.start_time} - ${shift.end_time}`);
    console.log(`- Duration: ${shiftDuration} hours`);
    console.log(`- Weekly hours: ${this.weeklyHoursTracker.getCurrentHours(employee.id)}`);
  }

  public getAssignments(): ShiftAssignment[] {
    return this.assignmentStorage.getAssignments();
  }

  public getCurrentCounts(): Record<string, number> {
    return this.shiftCounter.getCounts();
  }
}