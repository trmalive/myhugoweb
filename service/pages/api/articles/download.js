import { getAuthUser } from '@/lib/auth-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

export default async function handler(req, res) {
  try {
    const user = await getAuthUser(req, res)
    if (!user) return res.status(401).json({ error: '请先登录' })

    const { path } = req.query
    if (!path) return res.status(400).json({ error: '缺少文件路径' })
    if (path.includes('..')) return res.status(400).json({ error: '路径不合法' })

    const client = createServiceRoleClient()

    const { data: article } = await client.from('articles')
      .select('user_id, file_path')
      .eq('file_path', path)
      .single()

    if (!article) return res.status(404).json({ error: '文件不存在' })
    if (article.user_id !== user.id) {
      return res.status(403).json({ error: '无权访问该文件' })
    }

    const { data } = client.storage.from('articles').getPublicUrl(path)
    if (!data?.publicUrl) return res.status(404).json({ error: '文件不存在' })

    res.redirect(data.publicUrl)
  } catch (e) {
    console.error('Download error:', e)
    res.status(500).json({ error: '内部错误' })
  }
}
