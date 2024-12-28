import { format, addDays, parseISO } from 'https://esm.sh/date-fns@3.3.1';
import { DataFetcher } from './DataFetcher.ts';
import { ShiftRequirementsManager } from './ShiftRequirementsManager.ts';
import { ShiftAssignmentManager } from './ShiftAssignmentManager.ts';
import { getShiftType } from './ShiftUtils.ts';

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
      const assignmentManager = new ShiftAssignmentManager(requirementsManager);

      // Create schedule
      const schedule = await this.dataFetcher.createSchedule(weekStartDate, userId);
      const shiftTypes = ["Day Shift Early", "Day Shift", "Swing Shift", "Graveyard"];
      const allAssignments = [];

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

        allAssignments.push(...assignmentManager.getAssignments());
      }

      // Save assignments
      await this.dataFetcher.saveAssignments(allAssignments);

      console.log(`\n=== Schedule Generation Complete ===`);
      console.log(`Total assignments generated: ${allAssignments.length}`);

      return {
        message: 'Schedule generated successfully',
        assignmentsCount: allAssignments.length
      };
    } catch (error) {
      console.error('Error generating schedule:', error);
      throw error;
    }
  }
}