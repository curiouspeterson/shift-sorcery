import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const employees = []
    for (let i = 1; i <= 20; i++) {
      const email = `employee${i}@example.com`
      const firstName = `Test${i}`
      const lastName = `Employee${i}`
      const role = i <= 5 ? 'manager' : 'employee'

      const { data: { user }, error: createUserError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        password: 'password123', // For testing purposes only
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role,
        },
      })

      if (createUserError) throw createUserError
      employees.push(user)
    }

    return new Response(
      JSON.stringify({ message: 'Successfully created 20 employees' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})