import { getAuthUser } from '@/lib/auth-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getAuthUser(req, res)
  if (!user) return res.status(401).json({ error: '请先登录' })

  const profile = await createServiceRoleClient().from('profiles').select('role').eq('id', user.id).single()
  if (profile.data?.role !== 'admin') return res.status(403).json({ error: '无权限' })

  const { articleId } = req.body
  const client = createServiceRoleClient()
  await client.from('articles').update({ status: 'reviewing' }).eq('id', articleId)
  res.json({ success: true })
}
