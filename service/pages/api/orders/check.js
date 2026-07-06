import { getAuthUser } from '@/lib/auth-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { queryOrder } from '@/lib/alipay'

async function activateService(client, order) {
  if (order.type === 'single') return
  const durations = { '3month': 90, '6month': 180, '12month': 365 }
  const maxConcurrents = { '3month': 1, '6month': 1, '12month': 2 }
  const days = durations[order.type] || 30
  const startDate = new Date()
  await client.from('subscriptions').insert({
    user_id: order.user_id, order_id: order.id, plan_type: order.type,
    start_date: startDate.toISOString(),
    end_date: new Date(startDate.getTime() + days * 86400000).toISOString(),
    max_concurrent: maxConcurrents[order.type] || 1, status: 'active',
  })
}

export default async function handler(req, res) {
  const user = await getAuthUser(req, res)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { tradeNo } = req.query
  if (!tradeNo) return res.status(400).json({ error: 'Missing tradeNo' })

  const client = createServiceRoleClient()
  const { data: order } = await client.from('orders').select('*').eq('out_trade_no', tradeNo).single()
  if (!order) return res.status(404).json({ error: '订单不存在' })
  if (order.status === 'paid') return res.json({ status: 'paid' })

  try {
    const result = await queryOrder(tradeNo)
    if (['TRADE_SUCCESS', 'TRADE_FINISHED'].includes(result.trade_status)) {
      await client.from('orders').update({ status: 'paid', alipay_trade_no: result.trade_no, paid_at: new Date().toISOString() }).eq('id', order.id)
      await activateService(client, order)
      return res.json({ status: 'paid' })
    }
    res.json({ status: 'pending' })
  } catch { res.json({ status: 'pending' }) }
}
