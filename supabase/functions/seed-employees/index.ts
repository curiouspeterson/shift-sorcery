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
    console.log('Starting seed-employees function')
    
    // First, check if we can connect to the database
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.error('Database connection test failed:', testError)
      throw new Error('Failed to connect to database')
    }
    
    console.log('Database connection successful')

    const employees = []
    const existingUsers = new Set()

    // Get existing test users
    const { data: existingEmails, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .like('first_name', 'Test%')
    
    if (existingError) {
      console.error('Error fetching existing users:', existingError)
      throw existingError
    }
    
    if (existingEmails) {
      existingEmails.forEach(user => existingUsers.add(user.id))
      console.log(`Found ${existingUsers.size} existing test users`)
    }

    // Create 5 users (reduced number for testing)
    for (let i = 0; i < 5; i++) {
      const firstName = `Test ${firstNames[i % firstNames.length]}`
      const lastName = lastNames[i % lastNames.length]
      const email = `test.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@example.com`
      const role = i < 2 ? 'manager' : 'employee' // 2 managers, 3 employees

      try {
        console.log(`\nAttempting to create user ${email} with role ${role}`)

        // Create auth user
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
          console.error(`Error creating auth user ${email}:`, createUserError)
          continue
        }

        if (!user) {
          console.error(`No user returned for ${email}`)
          continue
        }

        console.log(`Auth user created successfully for ${email} with ID ${user.id}`)

        // Wait for trigger
        console.log('Waiting for trigger to create profile...')
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Check if profile was created by trigger
        const { data: profile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileCheckError) {
          console.error(`Error checking profile for ${email}:`, profileCheckError)
        }

        if (!profile) {
          console.log(`Profile not created automatically for ${email}, creating manually...`)
          
          // Create profile manually
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
            console.log('Attempting to clean up auth user...')
            await supabase.auth.admin.deleteUser(user.id)
            console.error('User creation failed, cleaned up auth user')
            continue
          }

          console.log(`Profile manually created for ${email}`)
        } else {
          console.log(`Profile already existed for ${email}`)
        }

        employees.push(user)
        console.log(`Successfully processed user ${email}`)

      } catch (error) {
        console.error(`Unexpected error processing user:`, error)
        continue
      }
    }

    const successMessage = `Successfully processed ${employees.length} employees`
    console.log(successMessage)

    return new Response(
      JSON.stringify({ 
        message: successMessage,
        created: employees.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Fatal error in seed-employees function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})