import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../_shared/cors.ts"
import { ScheduleGenerator } from "./scheduleGenerator.ts"
import { DataFetcher } from "./DataFetcher.ts"

console.log("Loading generate-schedule function...")

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { weekStartDate, userId } = await req.json()
    console.log('Received request:', { weekStartDate, userId })

    if (!weekStartDate || !userId) {
      console.error('Missing required parameters')
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration')
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    console.log('Supabase client initialized')

    // Fetch required data
    const dataFetcher = new DataFetcher(supabase)
    console.log('Starting data fetch...')
    
    const employees = await dataFetcher.fetchEmployees()
    console.log(`Fetched ${employees.length} employees`)
    
    const shifts = await dataFetcher.fetchShifts()
    console.log(`Fetched ${shifts.length} shifts`)
    
    const availability = await dataFetcher.fetchAvailability()
    console.log(`Fetched ${availability.length} availability records`)
    
    const requirements = await dataFetcher.fetchCoverageRequirements()
    console.log(`Fetched ${requirements.length} coverage requirements`)

    if (!employees.length || !shifts.length || !requirements.length) {
      console.error('Missing required data:', {
        employees: employees.length,
        shifts: shifts.length,
        requirements: requirements.length
      })
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient data for schedule generation',
          details: {
            employees: employees.length,
            shifts: shifts.length,
            requirements: requirements.length
          }
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate schedule
    console.log('Initializing schedule generator...')
    const generator = new ScheduleGenerator(
      employees,
      shifts,
      availability,
      requirements,
      weekStartDate
    )

    console.log('Starting schedule generation...')
    const schedule = await generator.generateSchedule()
    console.log('Schedule generated successfully')

    // Save schedule
    const { data: savedSchedule, error: saveError } = await supabase
      .from('schedules')
      .insert({
        week_start_date: weekStartDate,
        status: 'draft',
        created_by: userId
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving schedule:', saveError)
      throw saveError
    }

    console.log('Schedule saved, saving assignments...')
    
    // Save assignments
    const assignments = schedule.map(assignment => ({
      schedule_id: savedSchedule.id,
      employee_id: assignment.employeeId,
      shift_id: assignment.shiftId,
      date: assignment.date
    }))

    const { error: assignmentError } = await supabase
      .from('schedule_assignments')
      .insert(assignments)

    if (assignmentError) {
      console.error('Error saving assignments:', assignmentError)
      throw assignmentError
    }

    console.log('Schedule generation completed successfully')
    return new Response(
      JSON.stringify({ success: true, scheduleId: savedSchedule.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-schedule function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.details || error.toString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})