import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
        'Content-Type': 'application/json'
      }
    })
  }

  try {
    console.log('🚀 Starting create-employee function')
    const { email, firstName, lastName, role } = await req.json()

    console.log('📝 Creating user with data:', { email, firstName, lastName, role })

    // Create auth user with service role
    const { data: { user }, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password: 'temppass123', // Temporary password
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role,
      },
    })

    if (createUserError) {
      console.error('❌ Error creating auth user:', createUserError)
      throw createUserError
    }

    if (!user) {
      throw new Error('No user object returned')
    }

    console.log('✅ Auth user created successfully:', user.id)

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
      console.error('❌ Error checking profile:', profileCheckError)
      throw profileCheckError
    }

    if (!profile) {
      console.log('⚠️ Profile not created automatically, creating manually...')
      
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
        console.error('❌ Error creating profile:', profileError)
        // Clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(user.id)
        throw profileError
      }

      console.log('✅ Profile manually created')
    } else {
      console.log('✅ Profile automatically created')
    }

    return new Response(
      JSON.stringify({ 
        message: 'Employee created successfully',
        user: user 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Access-Control-Max-Age': '86400'
        },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ Fatal error in create-employee function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Access-Control-Max-Age': '86400'
        },
        status: 400,
      },
    )
  }
})