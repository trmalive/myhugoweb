import { getAuthUser } from '@/lib/auth-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { createQrCode } from '@/lib/alipay'
import { getPlan } from '@/lib/pricing'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await getAuthUser(req, res)
    if (!user) return res.status(401).json({ error: '请先登录' })

    const { planId } = req.body
    const plan = getPlan(planId)
    if (!plan) return res.status(400).json({ error: '无效的套餐' })

    const outTradeNo = `ORDER_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`

    const result = await createQrCode({ outTradeNo, totalAmount: plan.price, subject: `审稿服务 - ${plan.name}` })

    const client = createServiceRoleClient()
    const { data: order, error } = await client.from('orders').insert({
      user_id: user.id, type: planId, amount_cents: plan.price * 100,
      status: 'pending', out_trade_no: outTradeNo,
    }).select().single()

    if (error) return res.status(500).json({ error: '创建订单失败' })

    res.json({ qrCode: result.qrCode, tradeNo: outTradeNo, orderId: order.id })
  } catch (e) {
    console.error('Create order error:', e)
    res.status(500).json({ error: e.message })
  }
}
