import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export function createServerSupabase(req, res) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return createServerClient(url, anonKey, {
    cookies: {
      get(name) { return req.cookies[name] },
      set(name, value, options) {
        if (res.headersSent) return
        const maxAge = options?.maxAge ?? 604800
        res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`)
      },
      remove(name) {
        if (res.headersSent) return
        res.setHeader('Set-Cookie', `${name}=; Path=/; Max-Age=0`)
      },
    },
  })
}

export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
