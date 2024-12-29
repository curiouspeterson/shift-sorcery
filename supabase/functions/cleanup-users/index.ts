import { createClient } from '@supabase/supabase-js'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, serviceRoleKey)

const PRESERVED_USER_ID = '1babed00-537b-4f75-81ad-8c39aceffdaa'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting cleanup-users function')
    
    // First, get all users except the preserved one
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers()
    
    if (fetchError) {
      console.error('Error fetching users:', fetchError)
      throw fetchError
    }

    const usersToDelete = users.users.filter(user => user.id !== PRESERVED_USER_ID)
    console.log(`Found ${usersToDelete.length} users to delete`)

    // Delete users in batches to avoid timeouts
    const batchSize = 10
    let deletedCount = 0

    for (let i = 0; i < usersToDelete.length; i += batchSize) {
      const batch = usersToDelete.slice(i, i + batchSize)
      
      for (const user of batch) {
        try {
          // Delete the user
          const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
          
          if (deleteError) {
            console.error(`Error deleting user ${user.id}:`, deleteError)
            continue
          }
          
          deletedCount++
          console.log(`Successfully deleted user ${user.id}. Progress: ${deletedCount}/${usersToDelete.length}`)
        } catch (error) {
          console.error(`Error processing user ${user.id}:`, error)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully deleted ${deletedCount} out of ${usersToDelete.length} users`,
        preservedUserId: PRESERVED_USER_ID 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in cleanup-users function:', error)
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})