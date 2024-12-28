import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { addDays, format } from 'https://esm.sh/date-fns@3'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

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
      .select('*')
      .eq('role', 'employee')

    if (!employees?.length) {
      throw new Error('No employees found')
    }

    // Get shifts
    const { data: shifts } = await supabase
      .from('shifts')
      .select('*')

    if (!shifts?.length) {
      throw new Error('No shifts defined')
    }

    // Simple assignment: distribute shifts among employees
    const assignments = []
    for (let i = 0; i < 7; i++) {
      const date = format(addDays(new Date(weekStartDate), i), 'yyyy-MM-dd')
      
      for (const shift of shifts) {
        // Assign each shift to a random employee
        // In a real app, you'd want more sophisticated logic here
        const employee = employees[Math.floor(Math.random() * employees.length)]
        
        assignments.push({
          schedule_id: schedule.id,
          employee_id: employee.id,
          shift_id: shift.id,
          date: date,
        })
      }
    }

    // Insert assignments
    const { error: assignmentError } = await supabase
      .from('schedule_assignments')
      .insert(assignments)

    if (assignmentError) throw assignmentError

    return new Response(
      JSON.stringify({ message: 'Schedule generated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})