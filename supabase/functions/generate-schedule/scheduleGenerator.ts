import { format, addDays, parseISO } from 'https://esm.sh/date-fns@3.3.1';
import { ShiftRequirementsManager } from './ShiftRequirementsManager.ts';
import { ShiftAssignmentManager } from './ShiftAssignmentManager.ts';
import { getShiftType } from './shiftUtils.ts';
import { SCHEDULING_CONSTANTS } from './constants.ts';
import { DataFetcher } from './DataFetcher.ts';
import type { SchedulingResult } from './types.ts';

export class ScheduleGenerator {
  private dataFetcher: DataFetcher;

  constructor() {
    this.dataFetcher = new DataFetcher();
  }

  private async processShiftType(
    shiftType: string,
    shifts: any[],
    employees: any[],
    availability: any[],
    dayOfWeek: number,
    currentDate: string,
    schedule: any,
    requirementsManager: ShiftRequirementsManager,
    assignmentManager: ShiftAssignmentManager
  ) {
    console.log(`\n=== Processing ${shiftType} assignments ===`);
    
    const shiftsOfType = shifts.filter(s => getShiftType(s.start_time) === shiftType);
    console.log(`Found ${shiftsOfType.length} ${shiftType} shifts available`);

    // Sort shifts by duration (longer shifts first)
    const sortedShifts = [...shiftsOfType].sort((a, b) => {
      const durationA = this.getShiftDuration(a);
      const durationB = this.getShiftDuration(b);
      return durationB - durationA;
    });

    const requiredStaff = requirementsManager.getRequiredStaffForShiftType(shiftType);
    console.log(`Required staff for ${shiftType}: ${requiredStaff}`);

    // Get available employees for this shift type
    const availableEmployees = employees.filter(employee => {
      const hasAvailability = availability.some(a => 
        a.employee_id === employee.id && 
        a.day_of_week === dayOfWeek &&
        sortedShifts.some(shift => shift.id === a.shift_id)
      );
      return hasAvailability;
    });

    console.log(`Found ${availableEmployees.length} available employees for ${shiftType}`);

    // Shuffle employees to randomize assignments while maintaining requirements
    const shuffledEmployees = [...availableEmployees].sort(() => Math.random() - 0.5);
    
    const currentCounts = assignmentManager.getCurrentCounts();
    const currentStaffCount = currentCounts[shiftType] || 0;
    
    console.log(`Current staff count for ${shiftType}: ${currentStaffCount}/${requiredStaff}`);

    if (currentStaffCount < requiredStaff) {
      const neededStaff = requiredStaff - currentStaffCount;
      console.log(`Need ${neededStaff} more staff for ${shiftType}`);

      let assignedInThisRound = 0;
      for (const employee of shuffledEmployees) {
        // Stop if we've met requirements for this shift type
        if (assignedInThisRound >= neededStaff) {
          console.log(`Met requirements for ${shiftType}, stopping assignments`);
          break;
        }

        // Try to assign a shift to this employee
        for (const shift of sortedShifts) {
          if (assignmentManager.canAssignShift(employee, shift, availability, dayOfWeek)) {
            console.log(`Assigning ${employee.first_name} to ${shiftType} (${shift.start_time} - ${shift.end_time})`);
            assignmentManager.assignShift(schedule.id, employee, shift, currentDate);
            assignedInThisRound++;
            break;
          }
        }
        
        if (assignedInThisRound >= neededStaff) {
          console.log(`Met requirements for ${shiftType}, stopping employee assignments`);
          break;
        }
      }

      console.log(`Assigned ${assignedInThisRound} employees to ${shiftType} this round`);
    } else {
      console.log(`Requirements already met for ${shiftType}, skipping assignments`);
    }
  }

  public async generateSchedule(weekStartDate: string, userId: string): Promise<SchedulingResult> {
    console.log('\n=== Starting Schedule Generation ===');
    const { employees, shifts, coverageReqs, availability } = await this.dataFetcher.fetchSchedulingData();
    const schedule = await this.dataFetcher.createSchedule(weekStartDate, userId);

    const requirementsManager = new ShiftRequirementsManager(coverageReqs);
    const assignmentManager = new ShiftAssignmentManager(requirementsManager);

    // Process each day of the week
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = format(addDays(parseISO(weekStartDate), dayOffset), 'yyyy-MM-dd');
      const dayOfWeek = new Date(currentDate).getDay();
      
      console.log(`\n=== Processing ${format(new Date(currentDate), 'EEEE, MMM d')} ===`);
      
      let attempts = 0;
      let dayRequirementsMet = false;

      while (!dayRequirementsMet && attempts < SCHEDULING_CONSTANTS.MAX_SCHEDULING_ATTEMPTS) {
        attempts++;
        console.log(`\n>>> Attempt ${attempts} for ${currentDate}`);
        assignmentManager.resetDailyCounts();

        // Process shifts in strict order
        const shiftTypes = ["Day Shift Early", "Day Shift", "Swing Shift", "Graveyard"];
        
        // Process one shift type at a time, completing its requirements before moving on
        for (const shiftType of shiftTypes) {
          await this.processShiftType(
            shiftType,
            shifts,
            employees,
            availability,
            dayOfWeek,
            currentDate,
            schedule,
            requirementsManager,
            assignmentManager
          );
        }

        // Check if all requirements are met
        const counts = assignmentManager.getCurrentCounts();
        dayRequirementsMet = shiftTypes.every(shiftType => {
          const required = requirementsManager.getRequiredStaffForShiftType(shiftType);
          const current = counts[shiftType] || 0;
          const isMet = current === required;
          if (!isMet) {
            console.log(`❌ Requirements not met for ${shiftType}: ${current}/${required}`);
          }
          return isMet;
        });

        if (!dayRequirementsMet && attempts === SCHEDULING_CONSTANTS.MAX_SCHEDULING_ATTEMPTS) {
          console.log(`⚠️ Warning: Could not meet exact requirements for ${currentDate} after ${SCHEDULING_CONSTANTS.MAX_SCHEDULING_ATTEMPTS} attempts`);
        }
      }
    }

    const assignments = assignmentManager.getAssignments();
    console.log(`\n=== Schedule Generation Complete ===`);
    console.log(`Total assignments generated: ${assignments.length}`);
    
    await this.dataFetcher.saveAssignments(assignments);

    return {
      message: 'Schedule generated successfully',
      assignmentsCount: assignments.length
    };
  }

  private getShiftDuration(shift: any): number {
    const start = new Date(`2000-01-01T${shift.start_time}`);
    let end = new Date(`2000-01-01T${shift.end_time}`);
    
    if (end < start) {
      end = new Date(`2000-01-02T${shift.end_time}`);
    }
    
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }
}