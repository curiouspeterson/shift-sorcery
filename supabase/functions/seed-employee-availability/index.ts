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

    // Create availability entries for each employee
    const availabilityEntries = []

    for (const employee of employees) {
      // Randomly choose between 4x10 or 3x12+4 schedule pattern
      const usesTenHourShifts = Math.random() < 0.5
      
      // Randomly select a shift that will be used for all days
      let selectedShift;
      if (usesTenHourShifts) {
        // Filter for 10-hour shifts
        const tenHourShifts = allShifts.filter(shift => {
          const startHour = parseInt(shift.start_time.split(':')[0]);
          const endHour = parseInt(shift.end_time.split(':')[0]);
          const duration = (endHour < startHour ? endHour + 24 : endHour) - startHour;
          return duration === 10;
        });
        selectedShift = tenHourShifts[Math.floor(Math.random() * tenHourShifts.length)];
      } else {
        // Filter for 12-hour shifts
        const twelveHourShifts = allShifts.filter(shift => {
          const startHour = parseInt(shift.start_time.split(':')[0]);
          const endHour = parseInt(shift.end_time.split(':')[0]);
          const duration = (endHour < startHour ? endHour + 24 : endHour) - startHour;
          return duration === 12;
        });
        selectedShift = twelveHourShifts[Math.floor(Math.random() * twelveHourShifts.length)];
      }

      if (!selectedShift) {
        console.log('No suitable shifts found for pattern, skipping employee');
        continue;
      }

      // Randomly select consecutive days
      const numDays = usesTenHourShifts ? 4 : 3; // 4 days for 10-hour shifts, 3 days for 12-hour shifts
      const startDay = Math.floor(Math.random() * (7 - numDays)); // Ensure consecutive days fit within week
      
      // Add availability for consecutive days with the same shift
      for (let i = 0; i < numDays; i++) {
        availabilityEntries.push({
          employee_id: employee.id,
          day_of_week: startDay + i,
          shift_id: selectedShift.id,
          start_time: selectedShift.start_time,
          end_time: selectedShift.end_time,
        });
      }

      // If using 12-hour shifts, add one 4-hour shift
      if (!usesTenHourShifts) {
        const fourHourShifts = allShifts.filter(shift => {
          const startHour = parseInt(shift.start_time.split(':')[0]);
          const endHour = parseInt(shift.end_time.split(':')[0]);
          const duration = (endHour < startHour ? endHour + 24 : endHour) - startHour;
          return duration === 4;
        });

        if (fourHourShifts.length > 0) {
          const fourHourShift = fourHourShifts[Math.floor(Math.random() * fourHourShifts.length)];
          availabilityEntries.push({
            employee_id: employee.id,
            day_of_week: (startDay + 3) % 7, // Add 4-hour shift after the 12-hour shifts
            shift_id: fourHourShift.id,
            start_time: fourHourShift.start_time,
            end_time: fourHourShift.end_time,
          });
        }
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