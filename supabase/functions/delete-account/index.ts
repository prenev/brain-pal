// Lets a signed-in user permanently delete their own account and all data. Untested against a live project.
import { createClient } from 'npm:@supabase/supabase-js@2'

const url = Deno.env.get('SUPABASE_URL')!
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' }

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  const { data: { user } } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } }
  if (!user) return new Response('unauthorized', { status: 401, headers: cors })

  // Photos first (storage rows are not covered by the table cascade).
  const { data: files } = await admin.storage.from('photos').list(user.id, { limit: 1000 })
  if (files?.length) await admin.storage.from('photos').remove(files.map(f => `${user.id}/${f.name}`))
  // Tables cascade from auth.users.
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return new Response(error.message, { status: 500, headers: cors })
  return Response.json({ ok: true }, { headers: cors })
})
