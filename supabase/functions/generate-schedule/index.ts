import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { addDays, format, parseISO, differenceInHours } from 'https://esm.sh/date-fns@3'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Helper function to calculate hours between times
function calculateHoursBetween(start: string, end: string): number {
  const startDate = parseISO(`2000-01-01T${start}`)
  const endDate = parseISO(`2000-01-01T${end}`)
  return differenceInHours(endDate, startDate)
}

// Helper function to check if shift meets coverage requirements
async function meetsMinimumStaffing(
  date: string,
  shift: any,
  existingAssignments: any[]
): Promise<boolean> {
  const { data: requirements } = await supabase
    .from('coverage_requirements')
    .select('*')
    .order('start_time')

  if (!requirements) return false

  // Count employees working during each requirement period
  for (const req of requirements) {
    const employeesWorking = existingAssignments.filter(assignment => {
      const shiftStart = assignment.shift.start_time
      const shiftEnd = assignment.shift.end_time
      return (shiftStart <= req.end_time && shiftEnd >= req.start_time)
    }).length

    if (employeesWorking < req.min_employees) {
      return false
    }
  }

  return true
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { weekStartDate, userId } = await req.json()
    
    if (!weekStartDate || !userId) {
      throw new Error('weekStartDate and userId are required')
    }

    // Create new schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .insert({
        week_start_date: weekStartDate,
        status: 'draft',
        created_by: userId,
      })
      .select()
      .single()

    if (scheduleError) throw scheduleError

    // Get all employees
    const { data: employees } = await supabase
      .from('profiles')
      .select('*, employee_availability(*)')
      .eq('role', 'employee')

    if (!employees?.length) {
      throw new Error('No employees found')
    }

    // Get shifts
    const { data: shifts } = await supabase
      .from('shifts')
      .select('*')
      .order('start_time')

    if (!shifts?.length) {
      throw new Error('No shifts defined')
    }

    const assignments = []
    
    // Group shifts by duration
    const tenHourShifts = shifts.filter(s => calculateHoursBetween(s.start_time, s.end_time) === 10)
    const twelveHourShifts = shifts.filter(s => calculateHoursBetween(s.start_time, s.end_time) === 12)
    const fourHourShifts = shifts.filter(s => calculateHoursBetween(s.start_time, s.end_time) === 4)

    // Assign shifts to employees
    for (const employee of employees) {
      // Randomly choose between 4x10 or 3x12+4 schedule
      const usesTenHourShifts = Math.random() < 0.5

      if (usesTenHourShifts && tenHourShifts.length > 0) {
        // Assign 4 consecutive 10-hour shifts
        const shift = tenHourShifts[Math.floor(Math.random() * tenHourShifts.length)]
        const startDay = Math.floor(Math.random() * 4) // Random start day (0-3)
        
        for (let i = 0; i < 4; i++) {
          const date = format(addDays(new Date(weekStartDate), startDay + i), 'yyyy-MM-dd')
          assignments.push({
            schedule_id: schedule.id,
            employee_id: employee.id,
            shift_id: shift.id,
            date: date,
          })
        }
      } else if (twelveHourShifts.length > 0 && fourHourShifts.length > 0) {
        // Assign 3 consecutive 12-hour shifts and 1 4-hour shift
        const twelveHourShift = twelveHourShifts[Math.floor(Math.random() * twelveHourShifts.length)]
        const fourHourShift = fourHourShifts[Math.floor(Math.random() * fourHourShifts.length)]
        const startDay = Math.floor(Math.random() * 4) // Random start day (0-3)
        
        // Add three 12-hour shifts
        for (let i = 0; i < 3; i++) {
          const date = format(addDays(new Date(weekStartDate), startDay + i), 'yyyy-MM-dd')
          assignments.push({
            schedule_id: schedule.id,
            employee_id: employee.id,
            shift_id: twelveHourShift.id,
            date: date,
          })
        }
        
        // Add one 4-hour shift
        const fourHourDate = format(addDays(new Date(weekStartDate), startDay + 3), 'yyyy-MM-dd')
        assignments.push({
          schedule_id: schedule.id,
          employee_id: employee.id,
          shift_id: fourHourShift.id,
          date: fourHourDate,
        })
      }
    }

    console.log(`Generated ${assignments.length} assignments for ${employees.length} employees`)

    // Insert assignments
    const { error: assignmentError } = await supabase
      .from('schedule_assignments')
      .insert(assignments)

    if (assignmentError) throw assignmentError

    return new Response(
      JSON.stringify({ 
        message: 'Schedule generated successfully',
        assignmentsCount: assignments.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating schedule:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})