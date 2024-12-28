import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

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

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      throw employeesError
    }

    if (!employees || employees.length === 0) {
      throw new Error('No employees found')
    }

    console.log(`Found ${employees.length} employees`)

    // Get or create shifts for different times of day
    const shifts = [
      { name: 'Morning', start_time: '06:00', end_time: '14:00' },
      { name: 'Afternoon', start_time: '14:00', end_time: '22:00' },
      { name: 'Night', start_time: '22:00', end_time: '06:00' },
      { name: 'Part Time AM', start_time: '09:00', end_time: '13:00' },
      { name: 'Part Time PM', start_time: '17:00', end_time: '21:00' },
    ]

    // Create shifts if they don't exist
    for (const shift of shifts) {
      const { data: existingShift } = await supabase
        .from('shifts')
        .select('id')
        .eq('name', shift.name)
        .single()

      if (!existingShift) {
        console.log(`Creating shift: ${shift.name}`)
        const { error: createShiftError } = await supabase
          .from('shifts')
          .insert(shift)

        if (createShiftError) {
          console.error(`Error creating shift ${shift.name}:`, createShiftError)
          throw createShiftError
        }
      }
    }

    // Get all shifts after creation
    const { data: allShifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')

    if (shiftsError || !allShifts) {
      console.error('Error fetching shifts:', shiftsError)
      throw shiftsError
    }

    console.log(`Found ${allShifts.length} shifts`)

    // Delete existing availability entries
    const { error: deleteError } = await supabase
      .from('employee_availability')
      .delete()
      .gt('id', '0')

    if (deleteError) {
      console.error('Error deleting existing availability:', deleteError)
      throw deleteError
    }

    console.log('Cleared existing availability entries')

    // Create availability entries for each employee
    const availabilityEntries = []

    for (const employee of employees) {
      // Randomly assign 4-5 days of availability per employee
      const numDays = Math.floor(Math.random() * 2) + 4 // 4 or 5 days
      const availableDays = new Set()
      
      while (availableDays.size < numDays) {
        availableDays.add(Math.floor(Math.random() * 7))
      }

      for (const day of availableDays) {
        // Randomly select a shift for each day
        const randomShift = allShifts[Math.floor(Math.random() * allShifts.length)]
        
        availabilityEntries.push({
          employee_id: employee.id,
          day_of_week: day,
          shift_id: randomShift.id,
        })
      }
    }

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