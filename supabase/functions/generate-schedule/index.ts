import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { addDays, format } from 'https://esm.sh/date-fns@3'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { weekStartDate } = await req.json()
    const startDate = new Date(weekStartDate)
    const endDate = addDays(startDate, 6)

    // Get all employees
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'employee')

    if (employeesError) throw employeesError

    // Get coverage requirements
    const { data: coverage, error: coverageError } = await supabase
      .from('coverage_requirements')
      .select('*')

    if (coverageError) throw coverageError

    // Create new schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .insert({
        week_start_date: format(startDate, 'yyyy-MM-dd'),
        status: 'draft',
        created_by: (await req.json()).userId,
      })
      .select()
      .single()

    if (scheduleError) throw scheduleError

    // Generate and insert shifts (simplified version)
    const shifts = coverage.flatMap(req => 
      Array.from({ length: 7 }, (_, day) => {
        const date = addDays(startDate, day)
        return employees
          .slice(0, req.min_employees)
          .map(emp => ({
            schedule_id: schedule.id,
            employee_id: emp.id,
            date: format(date, 'yyyy-MM-dd'),
            shift_id: req.id,
          }))
      }).flat()
    )

    if (shifts.length > 0) {
      const { error: shiftsError } = await supabase
        .from('schedule_assignments')
        .insert(shifts)

      if (shiftsError) throw shiftsError
    }

    return new Response(
      JSON.stringify({ 
        scheduleId: schedule.id,
        message: 'Schedule generated successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})