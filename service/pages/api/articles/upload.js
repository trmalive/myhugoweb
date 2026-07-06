import { getAuthUser } from '@/lib/auth-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const user = await getAuthUser(req, res)
    if (!user) return res.status(401).json({ error: '请先登录' })

    const { title, fileName, filePath, fileSize } = req.body
    if (!title?.trim() || !filePath) return res.status(400).json({ error: '参数不完整' })
    if (fileSize > 50 * 1024 * 1024) return res.status(400).json({ error: '文件大小不能超过 50MB' })

    const expectedPrefix = `${user.id}/`
    if (!filePath.startsWith(expectedPrefix)) return res.status(400).json({ error: '文件路径不合法' })

    const client = createServiceRoleClient()

    const [artRes, subRes] = await Promise.all([
      client.from('articles').select('id,status,order_id,subscription_id').eq('user_id', user.id),
      client.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
    ])

    const articles = artRes.data || []
    const sub = subRes.data
    const activeCount = articles.filter(a => a.status !== 'closed').length
    const maxConcurrent = sub?.max_concurrent || 1

    let orderId = null
    let subscriptionId = null

    if (sub) {
      if (sub.end_date && new Date(sub.end_date) < new Date()) return res.status(400).json({ error: '包月已过期' })
      if (activeCount >= maxConcurrent) return res.status(400).json({ error: `已达同时上传上限 (${maxConcurrent}篇)` })
      subscriptionId = sub.id
    } else {
      if (activeCount > 0) return res.status(400).json({ error: '单篇用户一次只能处理 1 篇稿件' })

      const { data: paidOrders } = await client.from('orders')
        .select('id').eq('user_id', user.id).in('type', ['single', 'test']).eq('status', 'paid')
        .order('created_at').limit(1)

      if (paidOrders?.length) {
        orderId = paidOrders[0].id
        await client.from('orders').update({ status: 'used' }).eq('id', orderId).eq('status', 'paid')
      }
    }

    const { data: article, error } = await client.from('articles').insert({
      user_id: user.id, title: title.trim(), file_name: fileName, file_path: filePath,
      file_size: fileSize, order_id: orderId, subscription_id: subscriptionId,
      status: 'pending', current_round: 0,
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })

    res.json({ success: true, article })
  } catch (e) {
    console.error('Upload error:', e)
    res.status(500).json({ error: '内部错误' })
  }
}
