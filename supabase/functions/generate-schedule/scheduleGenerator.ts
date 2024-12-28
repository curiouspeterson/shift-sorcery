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
    
    const dayOfWeek = new Date(currentDate).getDay();
    const shiftTypes = ["Day Shift Early", "Day Shift", "Swing Shift", "Graveyard"];
    let allRequirementsMet = true;

    // Get all available employees for this day
    const availableEmployees = data.employees.filter(employee => {
      const hasAvailability = data.availability.some(a => 
        a.employee_id === employee.id && 
        a.day_of_week === dayOfWeek
      );
      return hasAvailability;
    });

    console.log(`Available employees for day: ${availableEmployees.length}`);

    if (availableEmployees.length === 0) {
      console.log('❌ No available employees for this day');
      return false;
    }

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
      const maxAttemptsPerShift = 15; // Increased attempts per shift

      // Keep trying to assign employees until we meet requirements or exhaust attempts
      while (currentCount < required && attempts < maxAttemptsPerShift) {
        attempts++;
        console.log(`\nAttempt ${attempts} for ${shiftType} (Current: ${currentCount}/${required})`);

        // Sort employees by weekly hours (prioritize those with fewer hours)
        const availableForShift = availableEmployees
          .filter(employee => !assignmentManager.isEmployeeAssignedToday(employee.id))
          .sort((a, b) => {
            const hoursA = assignmentManager.getEmployeeWeeklyHours(a.id);
            const hoursB = assignmentManager.getEmployeeWeeklyHours(b.id);
            return hoursA - hoursB;
          });

        if (availableForShift.length === 0) {
          console.log(`No more available employees for ${shiftType}`);
          break;
        }

        let assignedThisAttempt = false;

        for (const employee of availableForShift) {
          // Skip if employee would exceed weekly hours
          const nextShift = shiftsOfType[0];
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
              dayOfWeek
            )) {
              assignmentManager.assignShift(scheduleId, employee, shift, currentDate);
              currentCount++;
              assignedThisAttempt = true;
              console.log(`✅ Assigned ${employee.first_name} to ${shiftType} (${currentCount}/${required})`);
              break;
            }
          }

          if (assignedThisAttempt || currentCount >= required) break;
        }

        if (!assignedThisAttempt) {
          console.log(`❌ Could not assign any more employees to ${shiftType}`);
          if (currentCount < required) {
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
