import { createServerSupabase } from './supabase-server'

export async function getAuthUser(req, res) {
  const supabase = createServerSupabase(req, res)
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}
