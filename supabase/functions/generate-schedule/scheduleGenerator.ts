import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { format, addDays, parseISO } from 'https://esm.sh/date-fns@3.3.1';
import { ShiftRequirementsManager } from './ShiftRequirementsManager.ts';
import { ShiftAssignmentManager } from './ShiftAssignmentManager.ts';
import { getShiftType } from './shiftUtils.ts';

export class ScheduleGenerator {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  private async fetchData() {
    const [
      { data: employees },
      { data: shifts },
      { data: coverageReqs },
      { data: availability }
    ] = await Promise.all([
      this.supabase.from('profiles').select('*').eq('role', 'employee'),
      this.supabase.from('shifts').select('*').order('start_time'),
      this.supabase.from('coverage_requirements').select('*').order('start_time'),
      this.supabase.from('employee_availability').select('*')
    ]);

    if (!employees || !shifts || !coverageReqs || !availability) {
      throw new Error('Failed to fetch required data');
    }

    return { employees, shifts, coverageReqs, availability };
  }

  private async createSchedule(weekStartDate: string, userId: string) {
    const { data: schedule } = await this.supabase
      .from('schedules')
      .insert([{
        week_start_date: weekStartDate,
        status: 'draft',
        created_by: userId,
      }])
      .select()
      .single();

    if (!schedule) {
      throw new Error('Failed to create schedule');
    }

    return schedule;
  }

  public async generateSchedule(weekStartDate: string, userId: string) {
    const { employees, shifts, coverageReqs, availability } = await this.fetchData();
    const schedule = await this.createSchedule(weekStartDate, userId);

    const requirementsManager = new ShiftRequirementsManager(coverageReqs);
    const assignmentManager = new ShiftAssignmentManager(requirementsManager);

    // Process each day of the week
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = format(addDays(parseISO(weekStartDate), dayOffset), 'yyyy-MM-dd');
      const dayOfWeek = new Date(currentDate).getDay();
      
      console.log(`\nProcessing ${format(new Date(currentDate), 'EEEE, MMM d')}`);
      assignmentManager.resetDailyCounts();

      // Process shifts in priority order
      const shiftTypes = ["Graveyard", "Day Shift Early", "Swing Shift", "Day Shift"];
      
      for (const shiftType of shiftTypes) {
        console.log(`\nProcessing ${shiftType} assignments`);
        
        // Get shifts of current type
        const shiftsOfType = shifts.filter(s => getShiftType(s.start_time) === shiftType);
        console.log(`Found ${shiftsOfType.length} ${shiftType} shifts`);

        // Shuffle employees for fair distribution
        const shuffledEmployees = [...employees].sort(() => Math.random() - 0.5);

        // Try to assign each available employee
        for (const employee of shuffledEmployees) {
          for (const shift of shiftsOfType) {
            if (assignmentManager.canAssignShift(employee, shift, availability, dayOfWeek)) {
              assignmentManager.assignShift(schedule.id, employee, shift, currentDate);
              break; // Move to next employee once assigned
            }
          }
        }

        // Log current staffing levels
        const counts = assignmentManager.getCurrentCounts();
        console.log(`${shiftType} staffing: ${counts[shiftType]}/${requirementsManager.getRequiredStaffForShiftType(shiftType)}`);
      }
    }

    // Insert all assignments
    const assignments = assignmentManager.getAssignments();
    if (assignments.length > 0) {
      const { error: assignmentError } = await this.supabase
        .from('schedule_assignments')
        .insert(assignments);

      if (assignmentError) {
        throw assignmentError;
      }
    }

    return {
      message: 'Schedule generated successfully',
      assignmentsCount: assignments.length
    };
  }
}