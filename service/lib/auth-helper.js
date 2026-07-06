import { createClient } from '@supabase/supabase-js'
import { createServerSupabase } from './supabase-server'

export async function getAuthUser(req, res) {
  // Try Bearer token from Authorization header first
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data } = await supabase.auth.getUser(token)
    if (data?.user) return data.user
  }

  // Fallback to cookie-based auth
  const supabase = createServerSupabase(req, res)
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}
