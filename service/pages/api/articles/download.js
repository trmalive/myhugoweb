import { getAuthUser } from '@/lib/auth-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

export default async function handler(req, res) {
  const user = await getAuthUser(req, res)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { path } = req.query
  if (!path) return res.status(400).json({ error: 'Missing path' })

  const client = createServiceRoleClient()
  const { data } = client.storage.from('articles').getPublicUrl(path)
  if (!data?.publicUrl) return res.status(404).json({ error: 'File not found' })

  res.redirect(data.publicUrl)
}
