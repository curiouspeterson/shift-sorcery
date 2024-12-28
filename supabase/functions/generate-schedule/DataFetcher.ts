import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export class DataFetcher {
  async fetchSchedulingData() {
    console.log('🔄 Starting data fetch...');
    
    try {
      const [
        employeesResult,
        shiftsResult,
        coverageResult,
        availabilityResult
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('shifts').select('*'),
        supabase.from('coverage_requirements').select('*'),
        supabase.from('employee_availability').select('*')
      ]);

      // Log any errors from individual queries
      if (employeesResult.error) console.error('❌ Employees fetch error:', employeesResult.error);
      if (shiftsResult.error) console.error('❌ Shifts fetch error:', shiftsResult.error);
      if (coverageResult.error) console.error('❌ Coverage requirements fetch error:', coverageResult.error);
      if (availabilityResult.error) console.error('❌ Availability fetch error:', availabilityResult.error);

      // Throw first error encountered
      if (employeesResult.error) throw employeesResult.error;
      if (shiftsResult.error) throw shiftsResult.error;
      if (coverageResult.error) throw coverageResult.error;
      if (availabilityResult.error) throw availabilityResult.error;

      console.log('✅ Data fetch successful:', {
        employees: employeesResult.data?.length || 0,
        shifts: shiftsResult.data?.length || 0,
        coverage: coverageResult.data?.length || 0,
        availability: availabilityResult.data?.length || 0
      });

      return {
        employees: employeesResult.data,
        shifts: shiftsResult.data,
        coverageReqs: coverageResult.data,
        availability: availabilityResult.data
      };
    } catch (error) {
      console.error('❌ Data fetch failed:', error);
      throw error;
    }
  }

  async createSchedule(weekStartDate: string, userId: string) {
    console.log('🔄 Creating schedule for:', { weekStartDate, userId });
    
    try {
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

      if (error) {
        console.error('❌ Schedule creation failed:', error);
        throw error;
      }

      console.log('✅ Schedule created:', data);
      return data;
    } catch (error) {
      console.error('❌ Schedule creation error:', error);
      throw error;
    }
  }

  async saveAssignments(assignments: any[]) {
    if (assignments.length === 0) {
      console.log('ℹ️ No assignments to save');
      return;
    }

    console.log(`🔄 Saving ${assignments.length} assignments...`);
    
    try {
      const { error } = await supabase
        .from('schedule_assignments')
        .insert(assignments);

      if (error) {
        console.error('❌ Assignment save failed:', error);
        throw error;
      }

      console.log('✅ Assignments saved successfully');
    } catch (error) {
      console.error('❌ Assignment save error:', error);
      throw error;
    }
  }

  async deleteSchedule(scheduleId: string) {
    console.log('🔄 Deleting schedule:', scheduleId);
    
    try {
      // First delete all assignments
      const { error: assignmentsError } = await supabase
        .from('schedule_assignments')
        .delete()
        .eq('schedule_id', scheduleId);

      if (assignmentsError) {
        console.error('❌ Assignments deletion failed:', assignmentsError);
        throw assignmentsError;
      }

      // Then delete the schedule
      const { error: scheduleError } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId);

      if (scheduleError) {
        console.error('❌ Schedule deletion failed:', scheduleError);
        throw scheduleError;
      }

      console.log('✅ Schedule and assignments deleted successfully');
    } catch (error) {
      console.error('❌ Schedule deletion error:', error);
      throw error;
    }
  }

  async getAssignmentsCount(scheduleId: string): Promise<number> {
    console.log('🔄 Getting assignments count for schedule:', scheduleId);
    
    try {
      const { count, error } = await supabase
        .from('schedule_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('schedule_id', scheduleId);

      if (error) {
        console.error('❌ Assignments count failed:', error);
        throw error;
      }

      console.log('✅ Assignments count:', count);
      return count || 0;
    } catch (error) {
      console.error('❌ Assignments count error:', error);
      throw error;
    }
  }
}