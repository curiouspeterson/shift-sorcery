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
    const preservedUserId = '1babed00-537b-4f75-81ad-8c39aceffdaa'
    console.log(`Starting cleanup, preserving user: ${preservedUserId}`)

    // Get all users except the preserved one
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers()
    if (fetchError) throw fetchError

    const usersToDelete = users.users.filter(user => user.id !== preservedUserId)
    console.log(`Found ${usersToDelete.length} users to delete`)

    // Delete users in batches of 10
    const batchSize = 10
    for (let i = 0; i < usersToDelete.length; i += batchSize) {
      const batch = usersToDelete.slice(i, i + batchSize)
      console.log(`Processing batch ${i / batchSize + 1}`)

      for (const user of batch) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
        if (deleteError) {
          console.error(`Failed to delete user ${user.id}:`, deleteError)
          continue
        }
        console.log(`Deleted user ${user.id}`)
      }
    }

    return new Response(
      JSON.stringify({
        message: `Successfully cleaned up ${usersToDelete.length} users`,
        preservedUser: preservedUserId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in cleanup-users function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})