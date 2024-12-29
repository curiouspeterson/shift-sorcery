import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

const firstNames = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen'
]

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris'
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const employees = []
    const existingUsers = new Set()

    // First, get all existing users to avoid duplicates
    const { data: existingEmails } = await supabase
      .from('profiles')
      .select('id')
      .like('first_name', 'Test%')
    
    if (existingEmails) {
      existingEmails.forEach(user => existingUsers.add(user.id))
    }

    console.log(`Found ${existingUsers.size} existing test users`)

    // Create 20 new users (reduced from 40 to avoid timeouts)
    for (let i = 0; i < 20; i++) {
      const firstName = `Test ${firstNames[i % firstNames.length]}`
      const lastName = lastNames[i % lastNames.length]
      const email = `test.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@example.com`
      const role = i < 5 ? 'manager' : 'employee'

      try {
        console.log(`Creating user ${email} with role ${role}`)

        // Create the user in auth.users
        const { data: { user }, error: createUserError } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          password: 'password123',
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            role,
          },
        })

        if (createUserError) {
          console.error(`Error creating user ${email}:`, createUserError)
          continue
        }

        if (user) {
          // Wait a short moment to allow the trigger to process
          await new Promise(resolve => setTimeout(resolve, 1000))

          // Verify the profile was created
          const { data: profile, error: profileCheckError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profileCheckError || !profile) {
            console.log(`Profile not created automatically for ${email}, creating manually...`)
            // Manually create the profile since the trigger might not have worked
            const { error: profileError } = await supabase
              .from('profiles')
              .insert([{
                id: user.id,
                first_name: firstName,
                last_name: lastName,
                role: role,
                weekly_hours_limit: 40
              }])

            if (profileError) {
              console.error(`Error creating profile for ${email}:`, profileError)
              // Try to delete the auth user if profile creation failed
              await supabase.auth.admin.deleteUser(user.id)
              continue
            }
          }

          employees.push(user)
          console.log(`Successfully created user and profile for ${email}`)
        }
      } catch (error) {
        console.error(`Error processing user ${email}:`, error)
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