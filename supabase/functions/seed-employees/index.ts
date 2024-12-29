import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

const firstNames = [
  'James', 'John', 'Robert', 'Michael', 'William'
]

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones'
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Starting seed-employees function')
    console.log('📝 Testing database connection...')
    
    // First, check if we can connect to the database
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.error('❌ Database connection test failed:', testError)
      throw new Error(`Failed to connect to database: ${testError.message}`)
    }
    
    console.log('✅ Database connection successful')
    console.log('🔍 Checking for existing test users...')

    // Get existing test users
    const { data: existingEmails, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .like('first_name', 'Test%')
    
    if (existingError) {
      console.error('❌ Error fetching existing users:', existingError)
      throw existingError
    }

    const existingUsers = new Set(existingEmails?.map(user => user.id) || [])
    console.log(`📊 Found ${existingUsers.size} existing test users`)

    const employees = []

    // Create 5 users
    for (let i = 0; i < 5; i++) {
      const firstName = `Test ${firstNames[i]}`
      const lastName = lastNames[i]
      const email = `test.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Date.now()}@example.com`
      const role = i < 2 ? 'manager' : 'employee'

      try {
        console.log(`\n👤 Creating user ${email} with role ${role}`)

        // Create auth user with service role
        const { data: { user }, error: createUserError } = await supabase.auth.admin.createUser({
          email,
          password: 'password123',
          email_confirm: true,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            role,
          },
        })

        if (createUserError) {
          console.error(`❌ Error creating auth user ${email}:`, createUserError)
          continue
        }

        if (!user) {
          console.error(`❌ No user object returned for ${email}`)
          continue
        }

        console.log(`✅ Auth user created successfully: ${user.id}`)

        // Wait for trigger to create profile
        console.log('⏳ Waiting for trigger to create profile...')
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Verify profile creation
        const { data: profile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileCheckError) {
          console.error(`❌ Error checking profile for ${email}:`, profileCheckError)
          throw profileCheckError
        }

        if (!profile) {
          console.log(`⚠️ Profile not created automatically for ${email}, creating manually...`)
          
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
            console.error(`❌ Error creating profile for ${email}:`, profileError)
            // Clean up auth user if profile creation fails
            await supabase.auth.admin.deleteUser(user.id)
            console.log('🧹 Cleaned up auth user after profile creation failure')
            continue
          }

          console.log(`✅ Profile manually created for ${email}`)
        } else {
          console.log(`✅ Profile automatically created for ${email}`)
        }

        employees.push(user)
        console.log(`✅ Successfully processed user ${email}`)

      } catch (error) {
        console.error(`❌ Unexpected error processing user:`, error)
        continue
      }
    }

    const successMessage = `✅ Successfully processed ${employees.length} employees`
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
    console.error('❌ Fatal error in seed-employees function:', error)
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