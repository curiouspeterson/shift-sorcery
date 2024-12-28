import { format, addDays, parseISO } from 'https://esm.sh/date-fns@3.3.1';
import { DataFetcher } from './DataFetcher.ts';
import { ShiftRequirementsManager } from './ShiftRequirementsManager.ts';
import { ShiftAssignmentManager } from './ShiftAssignmentManager.ts';
import { getShiftType } from './ShiftUtils.ts';
import { SCHEDULING_CONSTANTS } from './constants.ts';

export class ScheduleGenerator {
  private dataFetcher: DataFetcher;

  constructor() {
    this.dataFetcher = new DataFetcher();
  }

  private validateScheduleRequirements(
    assignmentManager: ShiftAssignmentManager,
    requirementsManager: ShiftRequirementsManager
  ): boolean {
    const shiftTypes = ["Day Shift Early", "Day Shift", "Swing Shift", "Graveyard"];
    let allRequirementsMet = true;

    console.log("\n=== Validating Schedule Requirements ===");
    
    shiftTypes.forEach(shiftType => {
      const currentCount = assignmentManager.getCurrentCounts()[shiftType] || 0;
      const required = requirementsManager.getRequiredStaffForShiftType(shiftType);
      
      console.log(`${shiftType}:`);
      console.log(`- Required: ${required}`);
      console.log(`- Assigned: ${currentCount}`);
      
      if (currentCount < required) {
        console.log(`❌ Requirements not met for ${shiftType}`);
        allRequirementsMet = false;
      } else {
        console.log(`✅ Requirements met for ${shiftType}`);
      }
    });

    return allRequirementsMet;
  }

  private async generateScheduleAttempt(
    weekStartDate: string,
    userId: string,
    data: any,
    requirementsManager: ShiftRequirementsManager,
    assignmentManager: ShiftAssignmentManager
  ) {
    const schedule = await this.dataFetcher.createSchedule(weekStartDate, userId);
    const shiftTypes = ["Day Shift Early", "Day Shift", "Swing Shift", "Graveyard"];
    
    // Process each day
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = format(addDays(parseISO(weekStartDate), dayOffset), 'yyyy-MM-dd');
      console.log(`\n=== Processing ${format(new Date(currentDate), 'EEEE, MMM d')} ===`);
      
      assignmentManager.resetDailyCounts();

      // Process each shift type in sequence
      for (const shiftType of shiftTypes) {
        const shiftsOfType = data.shifts.filter(s => getShiftType(s.start_time) === shiftType);
        const shuffledEmployees = [...data.employees].sort(() => Math.random() - 0.5);
        const required = requirementsManager.getRequiredStaffForShiftType(shiftType);

        console.log(`\nProcessing ${shiftType} - Required staff: ${required}`);

        for (const employee of shuffledEmployees) {
          for (const shift of shiftsOfType) {
            if (assignmentManager.canAssignShift(
              employee,
              shift,
              data.availability,
              new Date(currentDate).getDay()
            )) {
              assignmentManager.assignShift(schedule.id, employee, shift, currentDate);
              break;
            }
          }
        }
      }
    }

    return schedule.id;
  }

  public async generateSchedule(weekStartDate: string, userId: string) {
    try {
      console.log('\n=== Starting Schedule Generation ===');
      const data = await this.dataFetcher.fetchSchedulingData();
      const requirementsManager = new ShiftRequirementsManager(data.coverageReqs);
      
      let attemptCount = 0;
      let scheduleId: string | null = null;
      let validSchedule = false;

      while (!validSchedule && attemptCount < SCHEDULING_CONSTANTS.MAX_SCHEDULING_ATTEMPTS) {
        attemptCount++;
        console.log(`\n=== Attempt ${attemptCount} of ${SCHEDULING_CONSTANTS.MAX_SCHEDULING_ATTEMPTS} ===`);
        
        const assignmentManager = new ShiftAssignmentManager(requirementsManager);
        
        // Generate schedule
        scheduleId = await this.generateScheduleAttempt(
          weekStartDate,
          userId,
          data,
          requirementsManager,
          assignmentManager
        );

        // Validate requirements
        validSchedule = this.validateScheduleRequirements(assignmentManager, requirementsManager);
        
        if (validSchedule) {
          console.log('\n✅ All shift requirements met!');
          // Save assignments
          await this.dataFetcher.saveAssignments(assignmentManager.getAssignments());
          break;
        } else {
          console.log('\n❌ Some shift requirements not met, retrying...');
          // Delete failed schedule
          if (scheduleId) {
            await this.dataFetcher.deleteSchedule(scheduleId);
          }
        }
      }

      if (!validSchedule) {
        throw new Error(`Failed to generate valid schedule after ${SCHEDULING_CONSTANTS.MAX_SCHEDULING_ATTEMPTS} attempts`);
      }

      console.log(`\n=== Schedule Generation Complete ===`);
      return {
        message: 'Schedule generated successfully',
        assignmentsCount: scheduleId ? (await this.dataFetcher.getAssignmentsCount(scheduleId)) : 0
      };
    } catch (error) {
      console.error('Error generating schedule:', error);
      throw error;
    }
  }
}