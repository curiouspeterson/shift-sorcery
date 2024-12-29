import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

const firstNames = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
  'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Donald', 'Mark', 'Paul', 'Steven', 'Andrew', 'Kenneth',
  'Joshua', 'Kevin', 'Brian', 'George', 'Edward', 'Ronald', 'Timothy', 'Jason', 'Jeffrey', 'Ryan',
  'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon',
  'Benjamin', 'Samuel', 'Gregory', 'Alexander', 'Frank', 'Patrick', 'Raymond', 'Jack', 'Dennis', 'Jerry'
]

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
]

// Function to generate unique name combinations
function generateUniqueNames(count: number) {
  const combinations: { firstName: string; lastName: string }[] = [];
  let firstIndex = 0;
  let lastIndex = 0;

  while (combinations.length < count && firstIndex < firstNames.length) {
    combinations.push({
      firstName: firstNames[firstIndex],
      lastName: lastNames[lastIndex],
    });

    lastIndex++;
    if (lastIndex >= lastNames.length) {
      lastIndex = 0;
      firstIndex++;
    }
  }

  return combinations;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Starting seed-employees function')
    
    const employees = []
    const timestamp = Date.now()
    const uniqueNames = generateUniqueNames(150)

    // Create test users
    for (let i = 0; i < uniqueNames.length; i++) {
      const { firstName, lastName } = uniqueNames[i]
      const email = `test.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${timestamp}@example.com`
      const role = i === 0 ? 'manager' : 'employee' // First user is manager, rest are employees

      try {
        console.log(`\n👤 Creating user ${email} with role ${role}`)

        // Create auth user with service role
        const { data: { user }, error: createUserError } = await supabase.auth.admin.createUser({
          email,
          password: 'temppass123',
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