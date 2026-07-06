import { useState, useEffect, useCallback, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function PaymentModal({ plan, onClose }) {
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState('pending')
  const [error, setError] = useState('')
  const intervalRef = useRef(null)

  const checkStatus = useCallback(async (tradeNo) => {
    try {
      const res = await fetch(`/api/orders/check?tradeNo=${tradeNo}`)
      const data = await res.json()
      if (data.status === 'paid') {
        setStatus('paid')
        return true
      }
    } catch {}
    return false
  }, [])

  useEffect(() => {
    if (!plan) return
    fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: plan.id }),
    }).then(r => r.json()).then(data => {
      if (data.qrCode) {
        setOrder(data)
        intervalRef.current = setInterval(async () => {
          const done = await checkStatus(data.tradeNo)
          if (done) clearInterval(intervalRef.current)
        }, 3000)
        setTimeout(() => intervalRef.current && clearInterval(intervalRef.current), 1800000)
      } else {
        setError(data.error || '创建订单失败')
      }
    })
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [plan, checkStatus])

  if (!plan) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {status === 'paid' ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h3>支付成功！</h3>
            <p>你的服务已开通，可以开始使用了</p>
            <button className="btn btn-primary" onClick={() => window.location.href = '/dashboard'}>进入我的稿件</button>
          </>
        ) : (
          <>
            <h3>{plan.name}</h3>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>{plan.priceLabel}</p>
            {error ? (
              <div className="flash flash-error">{error}</div>
            ) : order ? (
              <div>
                <div style={{ background: '#fff', display: 'inline-block', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb', margin: '12px 0' }}>
                  <QRCodeSVG value={order.qrCode} size={200} />
                </div>
                <p className="text-sm text-muted">请使用支付宝扫码付款</p>
                <p className="text-sm text-muted mt-2">付款后页面会自动跳转</p>
              </div>
            ) : (
              <p style={{ margin: '24px 0' }}>正在生成二维码...</p>
            )}
            <button className="btn btn-outline mt-4" onClick={onClose}>取消</button>
          </>
        )}
      </div>
    </div>
  )
}
