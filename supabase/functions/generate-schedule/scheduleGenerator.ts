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
    coverageTracker: CoverageTracker
  ): boolean {
    if (this.assignments.some(a => a.employee_id === emp.employeeId && a.date === currentDate)) {
      return false;
    }

    const shiftDuration = getShiftDuration(shift);
    const isShortShift = shiftDuration <= 4;
    const employeePattern = this.employeePatterns.get(emp.employeeId);

    // For 12-hour shifts or when no pattern exists, establish the pattern
    if (shiftDuration >= 12) {
      this.employeePatterns.set(emp.employeeId, getShiftType(shift.start_time));
    }

    // Check if the shift is compatible with the employee's established pattern
    if (!isShiftCompatible(employeePattern, shift, isShortShift)) {
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
      console.log(`Assigned ${emp.employeeId} to ${isShortShift ? '4-hour' : '12-hour'} shift ${shift.name} on ${currentDate}`);
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
      const dayOfWeek = new Date(currentDate).getDay();
      console.log(`Processing day ${dayOfWeek} (${currentDate})`);

      const coverageTracker = new CoverageTracker(coverageReqs);

      // Get available employees for this day
      const availableEmployees = availability
        .filter(a => a.day_of_week === dayOfWeek)
        .map(a => ({
          employeeId: a.employee_id,
          shiftId: a.shift_id,
        }));

      // Shuffle employees to randomize assignments while maintaining patterns
      const shuffledEmployees = availableEmployees.sort(() => Math.random() - 0.5);

      // First pass: Assign 12-hour shifts
      for (const emp of shuffledEmployees) {
        const shift = shifts.find(s => s.id === emp.shiftId);
        if (!shift) continue;

        if (getShiftDuration(shift) >= 12) {
          this.assignShift(schedule, currentDate, emp, shift, coverageTracker);
        }
      }

      // Second pass: Assign 4-hour shifts based on established patterns
      if (coverageTracker.hasUnmetRequirements()) {
        for (const emp of shuffledEmployees) {
          const shift = shifts.find(s => s.id === emp.shiftId);
          if (!shift) continue;

          if (getShiftDuration(shift) <= 4) {
            this.assignShift(schedule, currentDate, emp, shift, coverageTracker);
          }
        }
      }

      coverageTracker.logCoverageStatus(currentDate);
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