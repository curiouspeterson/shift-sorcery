import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { SchedulingData } from './types.ts';

export class DataFetcher {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  async fetchSchedulingData(): Promise<SchedulingData> {
    console.log('Fetching scheduling data...');
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

    console.log(`Fetched data:
      - ${employees.length} employees
      - ${shifts.length} shift templates
      - ${coverageReqs.length} coverage requirements
      - ${availability.length} availability records`);

    return { employees, shifts, coverageReqs, availability };
  }

  async createSchedule(weekStartDate: string, userId: string) {
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

  async saveAssignments(assignments: any[]) {
    if (assignments.length > 0) {
      const { error: assignmentError } = await this.supabase
        .from('schedule_assignments')
        .insert(assignments);

      if (assignmentError) {
        throw assignmentError;
      }
    }
  }
}