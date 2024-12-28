import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { format, addDays, parseISO } from 'https://esm.sh/date-fns@3.3.1';
import { CoverageTracker } from './coverageTracker.ts';
import { getShiftType, getShiftDuration, isShiftCompatible } from './shiftUtils.ts';
import { Assignment, Employee, Shift, CoverageRequirement, Availability, EmployeeShiftPattern, ShiftType } from './types.ts';

export class ScheduleGenerator {
  private supabase: any;
  private assignments: Assignment[] = [];
  private employeePatterns: Map<string, ShiftType> = new Map();

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

    // Log available shifts
    console.log('Available shifts:', shifts.map(s => ({
      name: s.name,
      time: `${s.start_time} - ${s.end_time}`,
      type: getShiftType(s.start_time)
    })));

    // Log employee availability
    console.log('Employee availability:', availability.map(a => ({
      employee_id: a.employee_id,
      day: a.day_of_week,
      shift: shifts.find(s => s.id === a.shift_id)
    })));

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

  private assignShift(
    schedule: any,
    currentDate: string,
    emp: { employeeId: string; shiftId: string },
    shift: Shift,
    coverageTracker: CoverageTracker,
    shiftType: string
  ): boolean {
    // Don't assign if employee already has a shift this day
    if (this.assignments.some(a => a.employee_id === emp.employeeId && a.date === currentDate)) {
      console.log(`Skipping assignment for ${emp.employeeId} - already has shift on ${currentDate}`);
      return false;
    }

    // Only assign if the shift matches the requested type
    const actualShiftType = getShiftType(shift.start_time);
    if (actualShiftType !== shiftType) {
      console.log(`Skipping assignment - shift type mismatch. Expected ${shiftType}, got ${actualShiftType}`);
      return false;
    }

    // Only assign if it helps meet minimum requirements
    if (coverageTracker.updateCoverage(shift)) {
      this.assignments.push({
        schedule_id: schedule.id,
        employee_id: emp.employeeId,
        shift_id: emp.shiftId,
        date: currentDate,
      });
      console.log(`Successfully assigned ${emp.employeeId} to ${shift.name} (${shift.start_time} - ${shift.end_time}) on ${currentDate}`);
      return true;
    }

    console.log(`Skipping assignment - wouldn't help meet coverage requirements`);
    return false;
  }

  public async generateSchedule(weekStartDate: string, userId: string) {
    const { employees, shifts, coverageReqs, availability } = await this.fetchData();
    const schedule = await this.createSchedule(weekStartDate, userId);

    // Process each day of the week
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = format(addDays(parseISO(weekStartDate), dayOffset), 'yyyy-MM-dd');
      const dayOfWeek = new Date(currentDate).getDay();
      console.log(`\nProcessing day ${dayOfWeek} (${currentDate})`);

      const coverageTracker = new CoverageTracker(coverageReqs);

      // Get available employees for this day
      const availableEmployees = availability
        .filter(a => a.day_of_week === dayOfWeek)
        .map(a => ({
          employeeId: a.employee_id,
          shiftId: a.shift_id,
        }));

      console.log(`Found ${availableEmployees.length} available employees for day ${dayOfWeek}`);

      // Process each shift type in order
      const shiftTypes = ["Day Shift Early", "Day Shift", "Swing Shift", "Graveyard"];
      
      for (const shiftType of shiftTypes) {
        console.log(`\nProcessing ${shiftType} assignments`);
        
        // Get employees available for this shift type
        const availableForShiftType = availableEmployees.filter(emp => {
          const shift = shifts.find(s => s.id === emp.shiftId);
          return shift && getShiftType(shift.start_time) === shiftType;
        });

        console.log(`Found ${availableForShiftType.length} employees available for ${shiftType}`);
        
        // Shuffle employees to randomize assignments while maintaining patterns
        const shuffledEmployees = availableForShiftType.sort(() => Math.random() - 0.5);

        for (const emp of shuffledEmployees) {
          const shift = shifts.find(s => s.id === emp.shiftId);
          if (!shift) {
            console.log(`No shift found for id ${emp.shiftId}`);
            continue;
          }

          this.assignShift(schedule, currentDate, emp, shift, coverageTracker, shiftType);
        }

        // Log coverage status after processing each shift type
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