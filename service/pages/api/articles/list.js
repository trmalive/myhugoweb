import { getAuthUser } from '@/lib/auth-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

export default async function handler(req, res) {
  const user = await getAuthUser(req, res)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const client = createServiceRoleClient()
  const { data, error } = await client.from('articles')
    .select('id,title,status,file_name,current_round,created_at')
    .eq('user_id', user.id).order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}
