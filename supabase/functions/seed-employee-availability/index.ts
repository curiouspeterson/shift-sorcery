import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Updated shift patterns to ensure better coverage
const SHIFT_PATTERNS = {
  EARLY: {
    days: 5,
    minEmployees: 8,
    startHourRange: [4, 6],
    percentage: 0.25 // 25% of workforce
  },
  DAY: {
    days: 5,
    minEmployees: 10,
    startHourRange: [7, 9],
    percentage: 0.35 // 35% of workforce
  },
  SWING: {
    days: 5,
    minEmployees: 7,
    startHourRange: [14, 16],
    percentage: 0.25 // 25% of workforce
  },
  GRAVEYARD: {
    days: 4,
    minEmployees: 6,
    startHourRange: [20, 22],
    percentage: 0.15 // 15% of workforce
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
      .order('start_time')

    if (shiftsError || !allShifts) {
      console.error('Error fetching shifts:', shiftsError)
      throw shiftsError
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

    // Group shifts by type
    const shiftsByType = {
      'Day Shift Early': allShifts.filter(s => {
        const hour = parseInt(s.start_time.split(':')[0])
        return hour >= 4 && hour < 8
      }),
      'Day Shift': allShifts.filter(s => {
        const hour = parseInt(s.start_time.split(':')[0])
        return hour >= 8 && hour < 16
      }),
      'Swing Shift': allShifts.filter(s => {
        const hour = parseInt(s.start_time.split(':')[0])
        return hour >= 16 && hour < 22
      }),
      'Graveyard': allShifts.filter(s => {
        const hour = parseInt(s.start_time.split(':')[0])
        return hour >= 22 || hour < 4
      })
    }

    // Calculate employee distribution
    const employeeGroups = {
      EARLY: employees.slice(0, Math.floor(employees.length * SHIFT_PATTERNS.EARLY.percentage)),
      DAY: employees.slice(
        Math.floor(employees.length * SHIFT_PATTERNS.EARLY.percentage),
        Math.floor(employees.length * (SHIFT_PATTERNS.EARLY.percentage + SHIFT_PATTERNS.DAY.percentage))
      ),
      SWING: employees.slice(
        Math.floor(employees.length * (SHIFT_PATTERNS.EARLY.percentage + SHIFT_PATTERNS.DAY.percentage)),
        Math.floor(employees.length * (SHIFT_PATTERNS.EARLY.percentage + SHIFT_PATTERNS.DAY.percentage + SHIFT_PATTERNS.SWING.percentage))
      ),
      GRAVEYARD: employees.slice(
        Math.floor(employees.length * (SHIFT_PATTERNS.EARLY.percentage + SHIFT_PATTERNS.DAY.percentage + SHIFT_PATTERNS.SWING.percentage))
      )
    }

    const availabilityEntries = []

    // Create availability entries for each shift pattern
    Object.entries(employeeGroups).forEach(([patternKey, groupEmployees]) => {
      const pattern = SHIFT_PATTERNS[patternKey as keyof typeof SHIFT_PATTERNS]
      const shiftType = patternKey === 'EARLY' ? 'Day Shift Early' :
                       patternKey === 'DAY' ? 'Day Shift' :
                       patternKey === 'SWING' ? 'Swing Shift' : 'Graveyard'
      
      const shifts = shiftsByType[shiftType]
      if (!shifts.length) {
        console.log(`No shifts found for pattern ${patternKey}`)
        return
      }

      groupEmployees.forEach((employee, index) => {
        // Rotate start days to ensure coverage throughout the week
        const startDay = index % (7 - pattern.days + 1)
        const selectedShift = shifts[index % shifts.length]

        // Add availability for consecutive days
        for (let i = 0; i < pattern.days; i++) {
          availabilityEntries.push({
            employee_id: employee.id,
            day_of_week: (startDay + i) % 7,
            shift_id: selectedShift.id
          })
        }
      })
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
        totalEntries: availabilityEntries.length,
        distributionSummary: {
          early: employeeGroups.EARLY.length,
          day: employeeGroups.DAY.length,
          swing: employeeGroups.SWING.length,
          graveyard: employeeGroups.GRAVEYARD.length
        }
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