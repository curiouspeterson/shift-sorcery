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

  private async generateDailySchedule(
    currentDate: string,
    data: any,
    assignmentManager: ShiftAssignmentManager,
    requirementsManager: ShiftRequirementsManager,
    scheduleId: string
  ): Promise<boolean> {
    console.log(`\n=== Processing ${format(new Date(currentDate), 'EEEE, MMM d')} ===`);
    
    const shiftTypes = ["Day Shift Early", "Day Shift", "Swing Shift", "Graveyard"];
    let allRequirementsMet = true;

    // Process each shift type
    for (const shiftType of shiftTypes) {
      console.log(`\n=== Processing ${shiftType} ===`);
      const required = requirementsManager.getRequiredStaffForShiftType(shiftType);
      console.log(`Required staff for ${shiftType}: ${required}`);

      if (required === 0) {
        console.log(`No requirements for ${shiftType}, skipping`);
        continue;
      }

      const shiftsOfType = data.shifts.filter(s => getShiftType(s.start_time) === shiftType);
      let currentCount = 0;
      let attempts = 0;
      const maxAttemptsPerShift = 10; // Allow multiple attempts per shift type

      // Keep trying to assign employees until we meet requirements or exhaust attempts
      while (currentCount < required && attempts < maxAttemptsPerShift) {
        attempts++;
        console.log(`\nAttempt ${attempts} for ${shiftType} (Current: ${currentCount}/${required})`);

        // Get all available employees who haven't been assigned today
        const availableEmployees = data.employees
          .filter(employee => !assignmentManager.isEmployeeAssignedToday(employee.id))
          .sort(() => Math.random() - 0.5); // Randomize employee order

        let assignedThisAttempt = false;

        for (const employee of availableEmployees) {
          // Skip if employee would exceed weekly hours
          const nextShift = shiftsOfType[0]; // Use first shift of type to check hours
          if (!assignmentManager.canAssignShiftHours(employee.id, nextShift)) {
            console.log(`${employee.first_name} would exceed weekly hours limit`);
            continue;
          }

          // Try each shift of this type
          for (const shift of shiftsOfType) {
            if (assignmentManager.canAssignShift(
              employee,
              shift,
              data.availability,
              new Date(currentDate).getDay()
            )) {
              assignmentManager.assignShift(scheduleId, employee, shift, currentDate);
              currentCount++;
              assignedThisAttempt = true;
              console.log(`✅ Assigned ${employee.first_name} to ${shiftType} (${currentCount}/${required})`);
              break;
            }
          }

          if (assignedThisAttempt) break;
        }

        if (!assignedThisAttempt) {
          console.log(`❌ Could not assign any more employees to ${shiftType}`);
          if (currentCount < required) {
            allRequirementsMet = false;
            console.log(`Failed to meet requirements for ${shiftType}: ${currentCount}/${required}`);
            return false;
          }
          break;
        }

        if (currentCount >= required) {
          console.log(`✅ Met requirements for ${shiftType}: ${currentCount}/${required}`);
          break;
        }
      }

      if (currentCount < required) {
        allRequirementsMet = false;
        console.log(`❌ Failed to meet requirements for ${shiftType} after ${attempts} attempts`);
        return false;
      }
    }

    return allRequirementsMet;
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
        
        // Create new schedule
        const schedule = await this.dataFetcher.createSchedule(weekStartDate, userId);
        scheduleId = schedule.id;
        
        const assignmentManager = new ShiftAssignmentManager(requirementsManager);
        let weekSuccess = true;

        // Process each day of the week
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const currentDate = format(addDays(parseISO(weekStartDate), dayOffset), 'yyyy-MM-dd');
          
          // Try to generate valid daily schedule
          const dailySuccess = await this.generateDailySchedule(
            currentDate,
            data,
            assignmentManager,
            requirementsManager,
            schedule.id
          );

          if (!dailySuccess) {
            console.log(`\n❌ Failed to generate valid schedule for ${currentDate}`);
            weekSuccess = false;
            break;
          }
        }

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
}
