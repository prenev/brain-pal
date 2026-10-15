// Lets a signed-in user permanently delete their own account and all of their data.
// verify_jwt stays ON (config.toml): the platform rejects calls without a valid user token, and we re-check it below.
import { createClient } from 'npm:@supabase/supabase-js@2'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: cors })

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply({ error: 'method not allowed' }, 405)

  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  const { data } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } }
  const user = data.user
  if (!user) return reply({ error: 'unauthorized' }, 401)

  // 1. Stored photos + voice memos (storage objects are not covered by the table cascade). Page until the folder is empty.
  //    If cleanup fails we stop *before* touching the account, so the user can simply try again.
  for (let guard = 0; guard < 200; guard++) {
    const { data: files, error } = await admin.storage.from('photos').list(user.id, { limit: 100 })
    if (error) return reply({ error: `could not list files: ${error.message}` }, 500)
    if (!files?.length) break
    const { error: rmError } = await admin.storage.from('photos').remove(files.map(f => `${user.id}/${f.name}`))
    if (rmError) return reply({ error: `could not delete files: ${rmError.message}` }, 500)
  }

  // 2. The account itself. Every table references auth.users ON DELETE CASCADE, so all rows go with it.
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return reply({ error: error.message }, 500)
  return reply({ ok: true })
})
