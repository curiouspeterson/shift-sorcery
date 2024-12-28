import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export class ScheduleGenerator {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  public async generateSchedule(weekStartDate: string, userId: string) {
    console.log('Starting schedule generation process...');

    try {
      // Fetch required data
      const { data: employees, error: employeesError } = await this.supabase
        .from('profiles')
        .select('*');

      if (employeesError) throw employeesError;
      console.log(`Fetched ${employees.length} employees`);

      const { data: shifts, error: shiftsError } = await this.supabase
        .from('shifts')
        .select('*');

      if (shiftsError) throw shiftsError;
      console.log(`Fetched ${shifts.length} shifts`);

      const { data: requirements, error: requirementsError } = await this.supabase
        .from('coverage_requirements')
        .select('*');

      if (requirementsError) throw requirementsError;
      console.log(`Fetched ${requirements.length} requirements`);

      // Create schedule record
      const { data: schedule, error: scheduleError } = await this.supabase
        .from('schedules')
        .insert({
          week_start_date: weekStartDate,
          status: 'draft',
          created_by: userId
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;
      console.log('Created schedule record:', schedule.id);

      // For now, create some basic assignments (this should be replaced with actual scheduling logic)
      const assignments = [];
      for (const employee of employees) {
        for (const shift of shifts) {
          assignments.push({
            schedule_id: schedule.id,
            employee_id: employee.id,
            shift_id: shift.id,
            date: weekStartDate
          });
        }
      }

      const { error: assignmentsError } = await this.supabase
        .from('schedule_assignments')
        .insert(assignments);

      if (assignmentsError) throw assignmentsError;
      console.log(`Created ${assignments.length} assignments`);

      return {
        success: true,
        scheduleId: schedule.id,
        assignmentsCount: assignments.length
      };

    } catch (error) {
      console.error('Error generating schedule:', error);
      throw error;
    }
  }
}