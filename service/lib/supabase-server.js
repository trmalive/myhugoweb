import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function createServerSupabase(req, res) {
  return createServerClient(url, anonKey, {
    cookies: {
      get(name) {
        return req.cookies[name]
      },
      set(name, value, options) {
        const maxAge = options?.maxAge ?? 3600
        res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`)
      },
      remove(name) {
        res.setHeader('Set-Cookie', `${name}=; Path=/; Max-Age=0`)
      },
    },
  })
}

export function createServiceRoleClient() {
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
