import { createClient } from '@supabase/supabase-js'
import { serve } from 'https://deno.fresh.dev/std@v9.6.1/http/server.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, serviceRoleKey)

const PRESERVED_USER_ID = '1babed00-537b-4f75-81ad-8c39aceffdaa'

serve(async (req) => {
  try {
    // First, get all users except the preserved one
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers()
    
    if (fetchError) {
      throw fetchError
    }

    const usersToDelete = users.users.filter(user => user.id !== PRESERVED_USER_ID)
    console.log(`Found ${usersToDelete.length} users to delete`)

    // Delete users in batches to avoid timeouts
    const batchSize = 10
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
          
          console.log(`Successfully deleted user ${user.id}`)
        } catch (error) {
          console.error(`Error processing user ${user.id}:`, error)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully processed deletion of ${usersToDelete.length} users`,
        preservedUserId: PRESERVED_USER_ID 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in cleanup-users function:', error)
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})