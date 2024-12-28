import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { weekStartDate, userId } = await req.json()
    console.log('Received request:', { weekStartDate, userId })

    if (!weekStartDate || !userId) {
      throw new Error('Missing required parameters')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    console.log('Supabase client initialized')

    // Create schedule record
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .insert({
        week_start_date: weekStartDate,
        status: 'draft',
        created_by: userId
      })
      .select()
      .single()

    if (scheduleError) throw scheduleError
    console.log('Created schedule:', schedule)

    // Fetch employees
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('*')
      .order('first_name')

    if (employeesError) throw employeesError
    console.log(`Fetched ${employees.length} employees`)

    // Fetch shifts
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
      .order('start_time')

    if (shiftsError) throw shiftsError
    console.log(`Fetched ${shifts.length} shifts`)

    // Create basic assignments (one shift per employee for testing)
    const assignments = []
    for (const employee of employees) {
      for (const shift of shifts) {
        assignments.push({
          schedule_id: schedule.id,
          employee_id: employee.id,
          shift_id: shift.id,
          date: weekStartDate
        })
      }
    }

    // Save assignments
    const { error: assignmentsError } = await supabase
      .from('schedule_assignments')
      .insert(assignments)

    if (assignmentsError) throw assignmentsError
    console.log(`Created ${assignments.length} assignments`)

    return new Response(
      JSON.stringify({
        success: true,
        scheduleId: schedule.id,
        assignmentsCount: assignments.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})