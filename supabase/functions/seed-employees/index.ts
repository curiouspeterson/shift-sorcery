import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Common first names and last names for more realistic test data
const firstNames = [
  'James', 'John', 'Robert', 'Michael', 'William',
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth',
  'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
  'Sarah', 'Jessica', 'Susan', 'Margaret', 'Karen'
]

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones',
  'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson',
  'Martin', 'Lee', 'Thompson', 'White', 'Harris'
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const employees = []
    const existingUsers = new Set()

    // First, get all existing users
    const { data: existingEmails } = await supabase
      .from('profiles')
      .select('id')
      .like('first_name', 'Test%')
    
    if (existingEmails) {
      existingEmails.forEach(user => existingUsers.add(user.id))
    }

    console.log(`Found ${existingUsers.size} existing test users`)

    // Create new users
    for (let i = 0; i < 20; i++) {
      const firstName = firstNames[i]
      const lastName = lastNames[i]
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`
      const role = i < 5 ? 'manager' : 'employee'

      try {
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

        if (createUserError) {
          if (createUserError.message.includes('already been registered')) {
            console.log(`Skipping ${email} - already exists`)
            continue
          }
          throw createUserError
        }

        if (user) {
          employees.push(user)
          console.log(`Created user ${email}`)
        }
      } catch (error) {
        // Log the error but continue with other users
        console.error(`Error creating user ${email}:`, error)
        continue
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully processed 20 employees. Created ${employees.length} new users.`,
        created: employees.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in seed-employees function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})