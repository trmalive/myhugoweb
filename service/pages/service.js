import { useState } from 'react'
import Layout from '@/components/Layout'
import PaymentModal from '@/components/PaymentModal'
import { PLANS } from '@/lib/pricing'

export default function ServicePage() {
  const [selectedPlan, setSelectedPlan] = useState(null)

  return (
    <Layout>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>教学论文预审稿服务</h1>
        <p className="text-muted">专业审稿，多次修改直到接收</p>
      </div>

      <div className="pricing-grid">
        {PLANS.map(plan => (
          <div key={plan.id} className={`pricing-card ${plan.badge ? 'featured' : ''}`}>
            {plan.badge && <span className="badge">{plan.badge}</span>}
            <div className="name">{plan.name}</div>
            <div className="price">{plan.priceLabel}</div>
            <div className="desc">{plan.description}</div>
            <ul className="features">
              {plan.features.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            <button className="btn btn-primary" onClick={() => setSelectedPlan(plan)}>立即购买</button>
          </div>
        ))}
      </div>

      {selectedPlan && <PaymentModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />}
    </Layout>
  )
}
