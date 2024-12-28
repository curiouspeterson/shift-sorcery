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
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting to seed employee availability...')

    // Get all employees
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

    // Delete existing availability entries to avoid duplicates
    const { error: deleteError } = await supabase
      .from('employee_availability')
      .delete()
      .neq('employee_id', 'none') // This will delete all entries

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