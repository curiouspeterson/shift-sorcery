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
      
      console.log('📊 Data fetched:', {
        employeesCount: data.employees?.length || 0,
        shiftsCount: data.shifts?.length || 0,
        coverageReqsCount: data.coverageReqs?.length || 0,
        availabilityCount: data.availability?.length || 0
      });
      
      if (!data.employees || data.employees.length === 0) {
        console.error('❌ No employees available for scheduling');
        throw new Error('No employees available for scheduling');
      }

      if (!data.shifts || data.shifts.length === 0) {
        console.error('❌ No shifts defined in the system');
        throw new Error('No shifts defined in the system');
      }

      const requirementsManager = new ShiftRequirementsManager(data.coverageReqs);
      console.log('📋 Shift requirements initialized');
      
      let attemptCount = 0;
      let validSchedule = false;
      let scheduleId: string | null = null;
      let lastError: Error | null = null;

      while (!validSchedule && attemptCount < SCHEDULING_CONSTANTS.MAX_SCHEDULING_ATTEMPTS) {
        attemptCount++;
        console.log(`\n=== Attempt ${attemptCount} of ${SCHEDULING_CONSTANTS.MAX_SCHEDULING_ATTEMPTS} ===`);
        
        try {
          console.log('🔄 Creating new schedule record');
          const schedule = await this.dataFetcher.createSchedule(weekStartDate, userId);
          scheduleId = schedule.id;
          console.log('✅ Schedule record created:', scheduleId);
          
          const assignmentManager = new ShiftAssignmentManager(requirementsManager);
          const schedulingStrategy = new SchedulingStrategy(assignmentManager, requirementsManager);
          
          console.log('🔄 Starting weekly schedule generation');
          const weekSuccess = await this.generateWeeklySchedule(
            weekStartDate,
            data,
            schedulingStrategy,
            schedule.id
          );

          if (weekSuccess) {
            console.log('\n✅ Successfully generated schedule for the week!');
            const assignments = assignmentManager.getAssignments();
            console.log(`📊 Total assignments generated: ${assignments.length}`);
            await this.dataFetcher.saveAssignments(assignments);
            validSchedule = true;
            break;
          } else {
            console.log('\n❌ Week generation failed, cleaning up and retrying...');
            if (scheduleId) {
              await this.dataFetcher.deleteSchedule(scheduleId);
            }
          }
        } catch (error) {
          console.error('Error during schedule generation attempt:', error);
          lastError = error as Error;
          if (scheduleId) {
            await this.dataFetcher.deleteSchedule(scheduleId);
          }
        }
      }

      if (!validSchedule) {
        const errorMessage = lastError ? 
          `Failed to generate valid schedule: ${lastError.message}` :
          `Failed to generate valid schedule after ${SCHEDULING_CONSTANTS.MAX_SCHEDULING_ATTEMPTS} attempts`;
        throw new Error(errorMessage);
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
    console.log('\n=== Starting Weekly Schedule Generation ===');
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = format(addDays(parseISO(weekStartDate), dayOffset), 'yyyy-MM-dd');
      console.log(`\n🗓️ Processing date: ${currentDate}`);
      
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