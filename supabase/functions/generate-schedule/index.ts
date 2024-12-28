import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { format, addDays, parseISO } from 'https://esm.sh/date-fns@3.3.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

interface CoverageRequirement {
  start_time: string;
  end_time: string;
  min_employees: number;
}

interface Availability {
  employee_id: string;
  day_of_week: number;
  shift_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { weekStartDate, userId } = await req.json();
    console.log('Generating schedule for week starting:', weekStartDate);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all necessary data
    const { data: employees } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('role', 'employee');

    const { data: shifts } = await supabaseClient
      .from('shifts')
      .select('*')
      .order('start_time');

    const { data: coverageReqs } = await supabaseClient
      .from('coverage_requirements')
      .select('*')
      .order('start_time');

    const { data: availability } = await supabaseClient
      .from('employee_availability')
      .select('*');

    if (!employees || !shifts || !coverageReqs || !availability) {
      throw new Error('Failed to fetch required data');
    }

    // Create schedule record
    const { data: schedule } = await supabaseClient
      .from('schedules')
      .insert([
        {
          week_start_date: weekStartDate,
          status: 'draft',
          created_by: userId,
        },
      ])
      .select()
      .single();

    if (!schedule) {
      throw new Error('Failed to create schedule');
    }

    // Helper function to check if a shift covers a requirement
    const shiftCoversPeriod = (shift: Shift, req: CoverageRequirement) => {
      const shiftStart = new Date(`2000-01-01T${shift.start_time}`).getTime();
      const shiftEnd = new Date(`2000-01-01T${shift.end_time}`).getTime();
      const reqStart = new Date(`2000-01-01T${req.start_time}`).getTime();
      const reqEnd = new Date(`2000-01-01T${req.end_time}`).getTime();

      // Handle overnight shifts
      if (reqEnd < reqStart) {
        return (shiftStart <= reqEnd || shiftStart >= reqStart) &&
               (shiftEnd <= reqEnd || shiftEnd >= reqStart);
      }

      return shiftStart <= reqEnd && shiftEnd >= reqStart;
    };

    const assignments = [];
    
    // Process each day of the week
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = format(addDays(parseISO(weekStartDate), dayOffset), 'yyyy-MM-dd');
      const dayOfWeek = new Date(currentDate).getDay();
      console.log(`Processing day ${dayOfWeek} (${currentDate})`);

      // Track coverage for each requirement
      const coverageTracking = new Map(
        coverageReqs.map(req => [`${req.start_time}-${req.end_time}`, {
          requirement: req,
          currentCount: 0,
          minimumMet: false
        }])
      );

      // Get available employees for this day
      const availableEmployees = availability
        .filter(a => a.day_of_week === dayOfWeek)
        .map(a => ({
          employeeId: a.employee_id,
          shiftId: a.shift_id,
        }));

      // Shuffle available employees to randomize assignments while maintaining fairness
      const shuffledEmployees = availableEmployees.sort(() => Math.random() - 0.5);

      // First pass: Meet minimum requirements
      for (const emp of shuffledEmployees) {
        // Skip if employee already assigned for this day
        if (assignments.some(a => 
          a.employee_id === emp.employeeId && 
          a.date === currentDate
        )) {
          continue;
        }

        const shift = shifts.find(s => s.id === emp.shiftId);
        if (!shift) continue;

        // Find requirements that this shift would help cover and aren't at minimum yet
        const uncoveredReqs = coverageReqs.filter(req => {
          const tracking = coverageTracking.get(`${req.start_time}-${req.end_time}`);
          return shiftCoversPeriod(shift, req) && 
                 tracking && 
                 tracking.currentCount < req.min_employees;
        });

        // Only assign if this helps meet an unfulfilled minimum requirement
        if (uncoveredReqs.length > 0) {
          assignments.push({
            schedule_id: schedule.id,
            employee_id: emp.employeeId,
            shift_id: emp.shiftId,
            date: currentDate,
          });

          // Update coverage counts
          uncoveredReqs.forEach(req => {
            const key = `${req.start_time}-${req.end_time}`;
            const tracking = coverageTracking.get(key);
            if (tracking) {
              tracking.currentCount++;
              tracking.minimumMet = tracking.currentCount >= req.min_employees;
            }
          });

          console.log(`Assigned ${emp.employeeId} to shift ${shift.name} on ${currentDate}`);
        }
      }

      // Log coverage status
      console.log('Coverage status for', currentDate);
      coverageTracking.forEach((value, key) => {
        console.log(`${key}: ${value.currentCount}/${value.requirement.min_employees} (Minimum met: ${value.minimumMet})`);
      });
    }

    // Insert all assignments
    if (assignments.length > 0) {
      const { error: assignmentError } = await supabaseClient
        .from('schedule_assignments')
        .insert(assignments);

      if (assignmentError) {
        throw assignmentError;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Schedule generated successfully',
        assignmentsCount: assignments.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error generating schedule:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});