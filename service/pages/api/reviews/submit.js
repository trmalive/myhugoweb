import { getAuthUser } from '@/lib/auth-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const user = await getAuthUser(req, res)
    if (!user) return res.status(401).json({ error: '请先登录' })

    const client = createServiceRoleClient()
    const profile = await client.from('profiles').select('role').eq('id', user.id).single()
    if (profile.data?.role !== 'admin') return res.status(403).json({ error: '无权限' })

    const { articleId, reviewNotes, reviewerFilePath, reviewerFileName } = req.body
    if (!articleId) return res.status(400).json({ error: '缺少参数' })

    const { data: article } = await client.from('articles').select('current_round, status').eq('id', articleId).single()
    if (!article) return res.status(404).json({ error: '稿件不存在' })
    if (article.status !== 'reviewing') return res.status(400).json({ error: '稿件当前状态不能提交审稿' })

    const newRound = (article.current_round || 0) + 1

    const { error: revError } = await client.from('reviews').insert({
      article_id: articleId, round_number: newRound,
      review_notes: reviewNotes || '', reviewer_file_path: reviewerFilePath || null,
      reviewer_file_name: reviewerFileName || null, status: 'completed',
    })
    if (revError) return res.status(500).json({ error: revError.message })

    await client.from('articles').update({ status: 'reviewed', current_round: newRound }).eq('id', articleId)
    res.json({ success: true, round: newRound })
  } catch (e) {
    console.error('Submit review error:', e)
    res.status(500).json({ error: '内部错误' })
  }
}
