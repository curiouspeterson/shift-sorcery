import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { format, addDays, parseISO } from 'https://esm.sh/date-fns@3.3.1';
import { CoverageTracker } from './coverageTracker.ts';
import { getShiftType, getShiftDuration } from './shiftUtils.ts';
import { Assignment, Employee, Shift, CoverageRequirement, Availability } from './types.ts';

export class ScheduleGenerator {
  private supabase: any;
  private assignments: Assignment[] = [];
  private employeesAssignedToday: Set<string> = new Set();
  private longShiftCount: number = 0;
  private earlyShiftCount: number = 0;
  private dayShiftCount: number = 0;
  private swingShiftCount: number = 0;
  private graveyardShiftCount: number = 0;

  // Constants based on requirements
  private readonly MAX_EARLY_SHIFTS = 6;
  private readonly MAX_LONG_SHIFTS = 3;
  private readonly MIN_SWING_SHIFTS = 7;
  private readonly MIN_GRAVEYARD_SHIFTS = 6;

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

  private resetDailyCounts() {
    this.employeesAssignedToday.clear();
    this.longShiftCount = 0;
    this.earlyShiftCount = 0;
    this.dayShiftCount = 0;
    this.swingShiftCount = 0;
    this.graveyardShiftCount = 0;
  }

  private isEmployeeAvailableForShift(
    employeeId: string,
    currentDate: string,
    shiftType: string,
    shifts: Shift[],
    availability: Availability[]
  ): boolean {
    // Check shift-specific limits
    if (shiftType === "Day Shift Early" && this.earlyShiftCount >= this.MAX_EARLY_SHIFTS) {
      console.log(`Max early shifts (${this.MAX_EARLY_SHIFTS}) reached for the day`);
      return false;
    }

    if (shiftType === "Swing Shift" && this.swingShiftCount >= this.MIN_SWING_SHIFTS) {
      console.log(`Max swing shifts reached`);
      return false;
    }

    if (shiftType === "Graveyard" && this.graveyardShiftCount >= this.MIN_GRAVEYARD_SHIFTS) {
      console.log(`Max graveyard shifts reached`);
      return false;
    }

    // Check if employee has already been assigned today
    if (this.employeesAssignedToday.has(employeeId)) {
      console.log(`${employeeId} already assigned today`);
      return false;
    }

    // Get day of week (0-6)
    const dayOfWeek = new Date(currentDate).getDay();

    // Check if employee has availability for this shift type on this day
    const employeeAvailability = availability.filter(a => 
      a.employee_id === employeeId && 
      a.day_of_week === dayOfWeek
    );

    // Check if any of the employee's availability slots match the shift type
    const hasMatchingShift = employeeAvailability.some(a => {
      const shift = shifts.find(s => s.id === a.shift_id);
      return shift && getShiftType(shift.start_time) === shiftType;
    });

    if (!hasMatchingShift) {
      console.log(`${employeeId} not available for ${shiftType} on day ${dayOfWeek}`);
      return false;
    }

    return true;
  }

  private shouldAssignLongShift(shiftType: string): boolean {
    // Reserve some employees for later shifts
    if (this.longShiftCount >= this.MAX_LONG_SHIFTS) {
      console.log(`Max long shifts (${this.MAX_LONG_SHIFTS}) reached`);
      return false;
    }

    // Ensure we have enough staff for swing and graveyard
    const remainingEmployees = this.employeesAssignedToday.size;
    const neededForSwing = Math.max(0, this.MIN_SWING_SHIFTS - this.swingShiftCount);
    const neededForGraveyard = Math.max(0, this.MIN_GRAVEYARD_SHIFTS - this.graveyardShiftCount);

    if (remainingEmployees < (neededForSwing + neededForGraveyard)) {
      console.log(`Need to reserve ${neededForSwing + neededForGraveyard} employees for later shifts`);
      return false;
    }

    return true;
  }

  private assignShift(
    schedule: any,
    currentDate: string,
    employeeId: string,
    shift: Shift,
    coverageTracker: CoverageTracker
  ): boolean {
    const shiftDuration = getShiftDuration(shift);
    const shiftType = getShiftType(shift.start_time);

    // Check shift-specific limits
    if (shiftDuration > 8 && !this.shouldAssignLongShift(shiftType)) {
      return false;
    }

    // Only assign if it helps meet coverage requirements
    if (coverageTracker.updateCoverage(shift)) {
      this.assignments.push({
        schedule_id: schedule.id,
        employee_id: employeeId,
        shift_id: shift.id,
        date: currentDate,
      });

      // Update counters
      this.employeesAssignedToday.add(employeeId);
      
      if (shiftDuration > 8) {
        this.longShiftCount++;
      }

      switch (shiftType) {
        case "Day Shift Early":
          this.earlyShiftCount++;
          break;
        case "Day Shift":
          this.dayShiftCount++;
          break;
        case "Swing Shift":
          this.swingShiftCount++;
          break;
        case "Graveyard":
          this.graveyardShiftCount++;
          break;
      }

      console.log(`Successfully assigned ${employeeId} to ${shift.name} (${shift.start_time} - ${shift.end_time}) on ${currentDate}`);
      console.log(`Counts - Long: ${this.longShiftCount}/${this.MAX_LONG_SHIFTS}, Early: ${this.earlyShiftCount}/${this.MAX_EARLY_SHIFTS}, Swing: ${this.swingShiftCount}/${this.MIN_SWING_SHIFTS}, Graveyard: ${this.graveyardShiftCount}/${this.MIN_GRAVEYARD_SHIFTS}`);
      return true;
    }

    return false;
  }

  public async generateSchedule(weekStartDate: string, userId: string) {
    const { employees, shifts, coverageReqs, availability } = await this.fetchData();
    const schedule = await this.createSchedule(weekStartDate, userId);

    // Process each day of the week
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = format(addDays(parseISO(weekStartDate), dayOffset), 'yyyy-MM-dd');
      console.log(`\nProcessing ${format(new Date(currentDate), 'EEEE, MMM d')}`);
      
      // Reset daily counters
      this.resetDailyCounts();

      // Process shift types in priority order
      // Graveyard first to ensure coverage, then early shifts, then regular day shifts
      const shiftTypes = ["Graveyard", "Day Shift Early", "Swing Shift", "Day Shift"];
      
      for (const shiftType of shiftTypes) {
        console.log(`\nProcessing ${shiftType} assignments`);
        const coverageTracker = new CoverageTracker(coverageReqs);
        
        // Get shifts of current type
        const shiftsOfType = shifts.filter(s => getShiftType(s.start_time) === shiftType);
        console.log(`Found ${shiftsOfType.length} ${shiftType} shifts`);

        // Sort shifts by duration (shorter shifts first for better distribution)
        shiftsOfType.sort((a, b) => getShiftDuration(a) - getShiftDuration(b));

        // Get available employees for this shift type
        const availableEmployees = employees.filter(emp => 
          this.isEmployeeAvailableForShift(
            emp.id,
            currentDate,
            shiftType,
            shifts,
            availability
          )
        );

        console.log(`Found ${availableEmployees.length} employees available for ${shiftType}`);

        // Randomize employee order for fair distribution
        const shuffledEmployees = [...availableEmployees].sort(() => Math.random() - 0.5);

        // Try to assign each available employee
        for (const employee of shuffledEmployees) {
          // Find matching shift from availability
          const dayOfWeek = new Date(currentDate).getDay();
          const employeeAvailability = availability.find(a => 
            a.employee_id === employee.id && 
            a.day_of_week === dayOfWeek &&
            shiftsOfType.some(s => s.id === a.shift_id)
          );

          if (!employeeAvailability) continue;

          const shift = shifts.find(s => s.id === employeeAvailability.shift_id);
          if (!shift) continue;

          this.assignShift(
            schedule,
            currentDate,
            employee.id,
            shift,
            coverageTracker
          );
        }

        // Log coverage status after processing shift type
        console.log(`Coverage status for ${shiftType}:`, coverageTracker.getCoverageStatus());
      }
    }

    // Insert all assignments
    if (this.assignments.length > 0) {
      const { error: assignmentError } = await this.supabase
        .from('schedule_assignments')
        .insert(this.assignments);

      if (assignmentError) {
        throw assignmentError;
      }
    }

    return {
      message: 'Schedule generated successfully',
      assignmentsCount: this.assignments.length
    };
  }
}
