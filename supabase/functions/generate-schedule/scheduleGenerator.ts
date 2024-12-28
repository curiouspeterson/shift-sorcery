import { format, addDays, parseISO } from 'https://esm.sh/date-fns@3.3.1';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { SCHEDULING_CONSTANTS } from './constants.ts';

export class ScheduleGenerator {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  private async fetchSchedulingData() {
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

    return { employees, shifts, coverageReqs, availability };
  }

  private getShiftType(startTime: string): string {
    const hour = parseInt(startTime.split(':')[0]);
    if (hour >= 4 && hour < 8) return "Day Shift Early";
    if (hour >= 8 && hour < 16) return "Day Shift";
    if (hour >= 16 && hour < 22) return "Swing Shift";
    return "Graveyard";
  }

  private async processShiftTypeForDay(
    shiftType: string,
    date: string,
    schedule: any,
    shifts: any[],
    employees: any[],
    availability: any[],
    requiredStaff: number,
    assignedEmployees: Set<string>
  ): Promise<string[]> {
    console.log(`\nProcessing ${shiftType} for ${date}`);
    console.log(`Required staff: ${requiredStaff}`);

    const dayOfWeek = new Date(date).getDay();
    const assignedForType: string[] = [];
    
    // Get shifts of this type
    const shiftsOfType = shifts.filter(s => this.getShiftType(s.start_time) === shiftType);
    console.log(`Available shifts: ${shiftsOfType.length}`);

    // Get available employees for this shift type
    const availableEmployees = employees.filter(employee => {
      // Skip if already assigned today
      if (assignedEmployees.has(employee.id)) return false;

      // Check if employee has availability for any shift of this type
      return availability.some(a => 
        a.employee_id === employee.id && 
        a.day_of_week === dayOfWeek &&
        shiftsOfType.some(shift => shift.id === a.shift_id)
      );
    });

    console.log(`Available employees: ${availableEmployees.length}`);

    // Randomize employee order
    const shuffledEmployees = [...availableEmployees].sort(() => Math.random() - 0.5);

    // Assign exactly the required number of staff
    for (let i = 0; i < Math.min(requiredStaff, shuffledEmployees.length); i++) {
      const employee = shuffledEmployees[i];
      
      // Find matching shift from availability
      const employeeAvailability = availability.find(a => 
        a.employee_id === employee.id && 
        a.day_of_week === dayOfWeek &&
        shiftsOfType.some(shift => shift.id === a.shift_id)
      );

      if (employeeAvailability) {
        const shift = shiftsOfType.find(s => s.id === employeeAvailability.shift_id);
        
        // Create assignment
        const assignment = {
          schedule_id: schedule.id,
          employee_id: employee.id,
          shift_id: shift.id,
          date: date
        };

        console.log(`Assigning ${employee.first_name} to ${shiftType} (${shift.start_time} - ${shift.end_time})`);
        
        assignedEmployees.add(employee.id);
        assignedForType.push(assignment);
      }
    }

    return assignedForType;
  }

  public async generateSchedule(weekStartDate: string, userId: string) {
    try {
      console.log('\n=== Starting Schedule Generation ===');
      const { employees, shifts, coverageReqs } = await this.fetchSchedulingData();

      // Create schedule
      const { data: schedule, error: scheduleError } = await this.supabase
        .from('schedules')
        .insert([{
          week_start_date: weekStartDate,
          status: 'draft',
          created_by: userId,
        }])
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      const allAssignments = [];
      const shiftTypes = ["Day Shift Early", "Day Shift", "Swing Shift", "Graveyard"];

      // Process each day
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDate = format(addDays(parseISO(weekStartDate), dayOffset), 'yyyy-MM-dd');
        console.log(`\n=== Processing ${format(new Date(currentDate), 'EEEE, MMM d')} ===`);
        
        const assignedEmployees = new Set<string>();

        // Process each shift type in order
        for (const shiftType of shiftTypes) {
          // Get required staff for this shift type
          const requirement = coverageReqs.find(req => {
            const reqStartHour = parseInt(req.start_time.split(':')[0]);
            switch (shiftType) {
              case "Day Shift Early":
                return reqStartHour >= 4 && reqStartHour < 8;
              case "Day Shift":
                return reqStartHour >= 8 && reqStartHour < 16;
              case "Swing Shift":
                return reqStartHour >= 16 && reqStartHour < 22;
              case "Graveyard":
                return reqStartHour >= 22 || reqStartHour < 4;
              default:
                return false;
            }
          });

          const requiredStaff = requirement?.min_employees || 0;
          
          const assignments = await this.processShiftTypeForDay(
            shiftType,
            currentDate,
            schedule,
            shifts,
            employees,
            await this.fetchSchedulingData().then(data => data.availability),
            requiredStaff,
            assignedEmployees
          );

          allAssignments.push(...assignments);
        }
      }

      // Save all assignments
      if (allAssignments.length > 0) {
        const { error: assignmentError } = await this.supabase
          .from('schedule_assignments')
          .insert(allAssignments);

        if (assignmentError) throw assignmentError;
      }

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