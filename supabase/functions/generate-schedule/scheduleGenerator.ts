import { format, addDays, parseISO } from 'https://esm.sh/date-fns@3.3.1';
import { DataFetcher } from './DataFetcher.ts';
import { ShiftRequirementsManager } from './ShiftRequirementsManager.ts';
import { ShiftAssignmentManager } from './ShiftAssignmentManager.ts';
import { SchedulingStrategy } from './SchedulingStrategy.ts';
import { SCHEDULING_CONSTANTS } from './constants.ts';

export class ScheduleGenerator {
  private dataFetcher: DataFetcher;

  constructor() {
    this.dataFetcher = new DataFetcher();
  }

  public async generateSchedule(weekStartDate: string, userId: string) {
    try {
      console.log('\n=== Starting Schedule Generation ===');
      const data = await this.dataFetcher.fetchSchedulingData();
      const requirementsManager = new ShiftRequirementsManager(data.coverageReqs);
      
      let attemptCount = 0;
      let validSchedule = false;
      let scheduleId: string | null = null;

      while (!validSchedule && attemptCount < SCHEDULING_CONSTANTS.MAX_SCHEDULING_ATTEMPTS) {
        attemptCount++;
        console.log(`\n=== Attempt ${attemptCount} of ${SCHEDULING_CONSTANTS.MAX_SCHEDULING_ATTEMPTS} ===`);
        
        const schedule = await this.dataFetcher.createSchedule(weekStartDate, userId);
        scheduleId = schedule.id;
        
        const assignmentManager = new ShiftAssignmentManager(requirementsManager);
        const schedulingStrategy = new SchedulingStrategy(assignmentManager, requirementsManager);
        
        const weekSuccess = await this.generateWeeklySchedule(
          weekStartDate,
          data,
          schedulingStrategy,
          schedule.id
        );

        if (weekSuccess) {
          console.log('\n✅ Successfully generated schedule for the week!');
          await this.dataFetcher.saveAssignments(assignmentManager.getAssignments());
          validSchedule = true;
          break;
        } else {
          console.log('\n❌ Week generation failed, cleaning up and retrying...');
          if (scheduleId) {
            await this.dataFetcher.deleteSchedule(scheduleId);
          }
        }
      }

      if (!validSchedule) {
        throw new Error(`Failed to generate valid schedule after ${SCHEDULING_CONSTANTS.MAX_SCHEDULING_ATTEMPTS} attempts`);
      }

      return {
        message: 'Schedule generated successfully',
        assignmentsCount: scheduleId ? (await this.dataFetcher.getAssignmentsCount(scheduleId)) : 0
      };
    } catch (error) {
      console.error('Error generating schedule:', error);
      throw error;
    }
  }

  private async generateWeeklySchedule(
    weekStartDate: string,
    data: any,
    schedulingStrategy: SchedulingStrategy,
    scheduleId: string
  ): Promise<boolean> {
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = format(addDays(parseISO(weekStartDate), dayOffset), 'yyyy-MM-dd');
      
      const dailySuccess = await schedulingStrategy.assignShiftsForDay(
        currentDate,
        data,
        scheduleId
      );

      if (!dailySuccess) {
        console.log(`\n❌ Failed to generate valid schedule for ${currentDate}`);
        return false;
      }
    }
    
    return true;
  }
}