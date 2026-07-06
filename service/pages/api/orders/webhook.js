import { createServiceRoleClient } from '@/lib/supabase-server'
import { verifyNotify } from '@/lib/alipay'

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
  try {
    if (req.method !== 'POST') return res.status(405).send('fail')
    if (req.body.app_id !== process.env.ALIPAY_APP_ID) return res.send('fail')

    const verified = verifyNotify(req.body)
    if (!verified) {
      console.error('Alipay webhook verification failed', req.body)
      return res.send('fail')
    }
    if (req.body.trade_status !== 'TRADE_SUCCESS') return res.send('success')

    const client = createServiceRoleClient()
    const { data: orders } = await client.from('orders').select('*').eq('out_trade_no', req.body.out_trade_no)
    const order = orders?.[0]
    if (!order || order.status !== 'pending') return res.send('success')

    const { data: updated } = await client.from('orders')
      .update({ status: 'paid', alipay_trade_no: req.body.trade_no, paid_at: new Date().toISOString() })
      .eq('id', order.id).eq('status', 'pending').select().single()

    if (updated) {
      await activateService(client, order)
    }

    res.send('success')
  } catch (e) {
    console.error('Webhook error:', e)
    res.status(500).send('fail')
  }
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } }
