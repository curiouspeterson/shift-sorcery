import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Extended list of first names and last names for more realistic test data
const firstNames = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
  'Christopher', 'Daniel', 'Paul', 'Mark', 'Donald', 'George', 'Kenneth', 'Steven', 'Edward', 'Brian',
  'Margaret', 'Lisa', 'Nancy', 'Betty', 'Sandra', 'Ashley', 'Dorothy', 'Kimberly', 'Emily', 'Donna',
  'Anthony', 'Kevin', 'Jason', 'Matthew', 'Gary', 'Timothy', 'Jose', 'Larry', 'Jeffrey', 'Frank',
  'Michelle', 'Carol', 'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Laura', 'Helen', 'Sharon'
]

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
  'Clark', 'Lewis', 'Robinson', 'Walker', 'Hall', 'Young', 'Allen', 'King', 'Wright', 'Scott',
  'Green', 'Baker', 'Adams', 'Nelson', 'Hill', 'Campbell', 'Mitchell', 'Roberts', 'Carter', 'Phillips',
  'Evans', 'Turner', 'Torres', 'Parker', 'Collins', 'Edwards', 'Stewart', 'Flores', 'Morris', 'Murphy',
  'Wilson', 'Cooper', 'Richardson', 'Cox', 'Howard', 'Ward', 'Torres', 'Peterson', 'Gray', 'James'
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

    // Create 60 new users
    for (let i = 0; i < 60; i++) {
      const firstName = firstNames[i]
      const lastName = lastNames[i]
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`
      const role = i < 15 ? 'manager' : 'employee' // First 15 users are managers, rest are employees

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
        message: `Successfully processed 60 employees. Created ${employees.length} new users.`,
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