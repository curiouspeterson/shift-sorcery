import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Default availability for weekdays (Mon-Fri)
const DEFAULT_WEEKDAY_START = '09:00'
const DEFAULT_WEEKDAY_END = '17:00'

// Default availability for weekends (Sat-Sun)
const DEFAULT_WEEKEND_START = '10:00'
const DEFAULT_WEEKEND_END = '16:00'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get all employees
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('id')

    if (employeesError) throw employeesError

    // Create availability entries for each employee
    const availabilityEntries = employees.flatMap(employee => {
      return Array.from({ length: 7 }, (_, i) => ({
        employee_id: employee.id,
        day_of_week: i,
        start_time: i > 4 ? DEFAULT_WEEKEND_START : DEFAULT_WEEKDAY_START,
        end_time: i > 4 ? DEFAULT_WEEKEND_END : DEFAULT_WEEKDAY_END,
      }))
    })

    // Insert availability entries
    const { error: insertError } = await supabase
      .from('employee_availability')
      .upsert(availabilityEntries, {
        onConflict: 'employee_id,day_of_week'
      })

    if (insertError) throw insertError

    return new Response(
      JSON.stringify({ 
        message: `Successfully added availability for ${employees.length} employees` 
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