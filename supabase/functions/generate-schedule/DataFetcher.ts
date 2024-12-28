import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export class DataFetcher {
  async fetchSchedulingData() {
    const [
      { data: employees, error: employeesError },
      { data: shifts, error: shiftsError },
      { data: coverageReqs, error: coverageError },
      { data: availability, error: availabilityError }
    ] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('shifts').select('*'),
      supabase.from('coverage_requirements').select('*'),
      supabase.from('employee_availability').select('*')
    ]);

    if (employeesError) throw employeesError;
    if (shiftsError) throw shiftsError;
    if (coverageError) throw coverageError;
    if (availabilityError) throw availabilityError;

    return {
      employees,
      shifts,
      coverageReqs,
      availability
    };
  }

  async createSchedule(weekStartDate: string, userId: string) {
    const { data, error } = await supabase
      .from('schedules')
      .insert([
        {
          week_start_date: weekStartDate,
          status: 'draft',
          created_by: userId
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async saveAssignments(assignments: any[]) {
    if (assignments.length === 0) return;

    const { error } = await supabase
      .from('schedule_assignments')
      .insert(assignments);

    if (error) throw error;
  }

  async deleteSchedule(scheduleId: string) {
    // First delete all assignments
    const { error: assignmentsError } = await supabase
      .from('schedule_assignments')
      .delete()
      .eq('schedule_id', scheduleId);

    if (assignmentsError) throw assignmentsError;

    // Then delete the schedule
    const { error: scheduleError } = await supabase
      .from('schedules')
      .delete()
      .eq('id', scheduleId);

    if (scheduleError) throw scheduleError;
  }

  async getAssignmentsCount(scheduleId: string): Promise<number> {
    const { count, error } = await supabase
      .from('schedule_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('schedule_id', scheduleId);

    if (error) throw error;
    return count || 0;
  }
}