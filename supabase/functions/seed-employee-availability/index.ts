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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting to seed employee availability...')

    // First, get all employees
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('id')

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      throw employeesError
    }

    if (!employees || employees.length === 0) {
      throw new Error('No employees found')
    }

    console.log(`Found ${employees.length} employees`)

    // Get or create default shifts for weekday and weekend
    const { data: weekdayShift, error: weekdayShiftError } = await supabase
      .from('shifts')
      .select('*')
      .eq('start_time', DEFAULT_WEEKDAY_START)
      .eq('end_time', DEFAULT_WEEKDAY_END)
      .single()

    if (weekdayShiftError) {
      console.log('Creating default weekday shift...')
      const { data: newWeekdayShift, error: createWeekdayError } = await supabase
        .from('shifts')
        .insert({
          name: 'Default Weekday',
          start_time: DEFAULT_WEEKDAY_START,
          end_time: DEFAULT_WEEKDAY_END,
        })
        .select()
        .single()

      if (createWeekdayError) throw createWeekdayError
      console.log('Created weekday shift:', newWeekdayShift)
    }

    const { data: weekendShift, error: weekendShiftError } = await supabase
      .from('shifts')
      .select('*')
      .eq('start_time', DEFAULT_WEEKEND_START)
      .eq('end_time', DEFAULT_WEEKEND_END)
      .single()

    if (weekendShiftError) {
      console.log('Creating default weekend shift...')
      const { data: newWeekendShift, error: createWeekendError } = await supabase
        .from('shifts')
        .insert({
          name: 'Default Weekend',
          start_time: DEFAULT_WEEKEND_START,
          end_time: DEFAULT_WEEKEND_END,
        })
        .select()
        .single()

      if (createWeekendError) throw createWeekendError
      console.log('Created weekend shift:', newWeekendShift)
    }

    // Get the final shifts to use
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
      .in('start_time', [DEFAULT_WEEKDAY_START, DEFAULT_WEEKEND_START])

    if (shiftsError || !shifts || shifts.length < 2) {
      throw new Error('Failed to get or create default shifts')
    }

    const weekdayShiftId = shifts.find(s => s.start_time === DEFAULT_WEEKDAY_START)?.id
    const weekendShiftId = shifts.find(s => s.start_time === DEFAULT_WEEKEND_START)?.id

    // Delete all existing availability entries
    const { error: deleteError } = await supabase
      .from('employee_availability')
      .delete()
      .gt('id', '00000000-0000-0000-0000-000000000000') // Delete all entries

    if (deleteError) {
      console.error('Error deleting existing availability:', deleteError)
      throw deleteError
    }

    console.log('Cleared existing availability entries')

    // Create availability entries for each employee
    const availabilityEntries = employees.flatMap(employee => {
      return Array.from({ length: 7 }, (_, i) => ({
        employee_id: employee.id,
        day_of_week: i,
        shift_id: i > 4 ? weekendShiftId : weekdayShiftId,
        start_time: i > 4 ? DEFAULT_WEEKEND_START : DEFAULT_WEEKDAY_START,
        end_time: i > 4 ? DEFAULT_WEEKEND_END : DEFAULT_WEEKDAY_END,
      }))
    })

    console.log(`Preparing to insert ${availabilityEntries.length} availability entries`)

    // Insert availability entries in batches of 100 to avoid hitting limits
    const batchSize = 100
    for (let i = 0; i < availabilityEntries.length; i += batchSize) {
      const batch = availabilityEntries.slice(i, i + batchSize)
      const { error: insertError } = await supabase
        .from('employee_availability')
        .insert(batch)

      if (insertError) {
        console.error('Error inserting availability batch:', insertError)
        throw insertError
      }
      console.log(`Inserted batch of ${batch.length} entries`)
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully added availability for ${employees.length} employees`,
        totalEntries: availabilityEntries.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in seed-employee-availability function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})