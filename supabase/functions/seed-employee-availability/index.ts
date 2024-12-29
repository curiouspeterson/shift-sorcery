import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Shift patterns for different types of schedules
const SHIFT_PATTERNS = {
  EARLY: {
    days: 4,
    preferredShiftDuration: 10,
    startHourRange: [4, 6]
  },
  DAY: {
    days: 4,
    preferredShiftDuration: 8,
    startHourRange: [7, 9]
  },
  SWING: {
    days: 4,
    preferredShiftDuration: 8,
    startHourRange: [14, 16]
  },
  GRAVEYARD: {
    days: 3,
    preferredShiftDuration: 12,
    startHourRange: [20, 22]
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting to seed employee availability...')

    // First, get all employees
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'employee')

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      throw employeesError
    }

    if (!employees || employees.length === 0) {
      throw new Error('No employees found')
    }

    console.log(`Found ${employees.length} employees`)

    // Get existing shifts
    const { data: allShifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')

    if (shiftsError || !allShifts) {
      console.error('Error fetching shifts:', shiftsError)
      throw shiftsError
    }

    if (allShifts.length === 0) {
      throw new Error('No shifts found. Please create shifts first.')
    }

    console.log(`Found ${allShifts.length} shifts`)

    // Delete existing availability entries
    const { error: deleteError } = await supabase
      .from('employee_availability')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (deleteError) {
      console.error('Error deleting existing availability:', deleteError)
      throw deleteError
    }

    console.log('Cleared existing availability entries')

    // Create availability entries
    const availabilityEntries = []
    const patterns = Object.values(SHIFT_PATTERNS)
    
    // Distribute employees evenly across shift patterns
    employees.forEach((employee, index) => {
      const pattern = patterns[index % patterns.length]
      const startDay = Math.floor(Math.random() * (7 - pattern.days))
      
      // Find appropriate shifts for this pattern
      const appropriateShifts = allShifts.filter(shift => {
        const startHour = parseInt(shift.start_time.split(':')[0])
        return startHour >= pattern.startHourRange[0] && 
               startHour <= pattern.startHourRange[1]
      })

      if (appropriateShifts.length === 0) {
        console.log(`No appropriate shifts found for pattern starting at ${pattern.startHourRange[0]}-${pattern.startHourRange[1]}`)
        return
      }

      const selectedShift = appropriateShifts[Math.floor(Math.random() * appropriateShifts.length)]

      // Add availability for consecutive days based on pattern
      for (let i = 0; i < pattern.days; i++) {
        availabilityEntries.push({
          employee_id: employee.id,
          day_of_week: (startDay + i) % 7,
          shift_id: selectedShift.id
        })
      }
    })

    console.log(`Preparing to insert ${availabilityEntries.length} availability entries`)

    // Insert availability entries in batches of 100
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