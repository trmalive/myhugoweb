import { getAuthUser } from '@/lib/auth-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const user = await getAuthUser(req, res)
    if (!user) return res.status(401).json({ error: '请先登录' })

    const { articleId } = req.body
    if (!articleId) return res.status(400).json({ error: '缺少参数' })

    const client = createServiceRoleClient()
    const { data: article } = await client.from('articles').select('*').eq('id', articleId).single()
    if (!article || article.user_id !== user.id) return res.status(404).json({ error: '稿件不存在' })
    if (article.status !== 'reviewed') return res.status(400).json({ error: '当前状态无法请求修改' })

    const { error } = await client.from('articles').update({ status: 'reviewing' }).eq('id', articleId)
    if (error) return res.status(500).json({ error: error.message })

    res.json({ success: true })
  } catch (e) {
    console.error('Request revision error:', e)
    res.status(500).json({ error: '内部错误' })
  }
}
