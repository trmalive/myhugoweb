import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import { createClient } from '@/lib/supabase-client'

const STATUS_MAP = { pending: '待审', reviewing: '审稿中', reviewed: '已回复', closed: '已完成' }

export default function AdminPage() {
  const [tab, setTab] = useState('articles')
  const [stats, setStats] = useState(null)
  const [articles, setArticles] = useState([])
  const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.push('/auth/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single()
      if (profile?.role !== 'admin') { router.push('/dashboard'); return }
      globalThis.__adminToken = data.session.access_token
      await loadAll()
    })
  }, [])

  async function loadAll() {
    try {
      const headers = globalThis.__adminToken
        ? { Authorization: `Bearer ${globalThis.__adminToken}` }
        : {}
      const [statsRes, artRes, ordRes, usrRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }).then(r => r.json()),
        fetch('/api/admin/articles', { headers }).then(r => r.json()),
        fetch('/api/admin/orders', { headers }).then(r => r.json()),
        fetch('/api/admin/users', { headers }).then(r => r.json()),
      ])
      setStats(statsRes)
      setArticles(artRes)
      setOrders(ordRes)
      setUsers(usrRes)
    } catch (e) {
      setError('加载失败: ' + e.message)
    }
    setLoading(false)
  }

  const handleStatus = async (articleId, status) => {
    if (status === 'reviewing') {
      const ep = status === 'reviewing' ? '/api/articles/reopen' : null
      if (ep) {
        await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleId }) })
        loadAll()
      }
    }
  }

  if (loading) return <Layout><p className="text-center text-muted" style={{ marginTop: 60 }}>加载中...</p></Layout>

  return (
    <Layout>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>管理员后台</h1>

      {error && <div className="flash flash-error">{error}</div>}

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div className="card text-center"><div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb' }}>¥{(stats.totalRevenue / 100).toLocaleString()}</div><div className="text-sm text-muted">总收入</div></div>
          <div className="card text-center"><div style={{ fontSize: 28, fontWeight: 800, color: '#059669' }}>{stats.totalOrders}</div><div className="text-sm text-muted">总订单</div></div>
          <div className="card text-center"><div style={{ fontSize: 28, fontWeight: 800, color: '#7c3aed' }}>{stats.activeSubscriptions}</div><div className="text-sm text-muted">活跃包月</div></div>
          <div className="card text-center"><div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>{stats.articleStatus?.pending || 0}</div><div className="text-sm text-muted">待审稿件</div></div>
          <div className="card text-center"><div style={{ fontSize: 28, fontWeight: 800 }}>{stats.totalUsers}</div><div className="text-sm text-muted">总客户</div></div>
        </div>
      )}

      {stats?.articleStatus && (
        <div className="card mb-4">
          <div className="card-header">稿件状态分布</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(stats.articleStatus).filter(([_, v]) => v > 0).map(([k, v]) => (
              <span key={k} className={`status status-${k}`}>{STATUS_MAP[k] || k}: {v}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
        {[
          { key: 'articles', label: '稿件审核' },
          { key: 'orders', label: '订单记录' },
          { key: 'users', label: '客户列表' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: tab === t.key ? 700 : 400,
              borderBottom: tab === t.key ? '2px solid #2563eb' : '2px solid transparent',
              color: tab === t.key ? '#2563eb' : '#6b7280',
            }}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'articles' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>用户</th><th>标题</th><th>文件</th><th>轮次</th><th>状态</th><th>上传时间</th><th>操作</th></tr></thead>
            <tbody>
              {articles.filter(a => a.statusRaw !== 'closed').map(a => (
                <tr key={a.id}>
                  <td className="text-sm">{a.email}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</td>
                  <td className="text-sm">{a.fileName}</td>
                  <td className="text-sm">{a.round}</td>
                  <td><span className={`status status-${a.statusRaw}`}>{a.status}</span></td>
                  <td className="text-sm">{a.createdAt}</td>
                  <td>
                    {a.statusRaw === 'pending' && (
                      <button className="btn btn-primary btn-sm" onClick={() => router.push(`/admin/review/${a.id}`)}>审稿</button>
                    )}
                    {a.statusRaw === 'reviewed' && (
                      <button className="btn btn-outline btn-sm" onClick={async () => {
                        await fetch('/api/articles/reopen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleId: a.id }) })
                        loadAll()
                      }}>新一轮</button>
                    )}
                    {a.statusRaw === 'reviewing' && (
                      <button className="btn btn-primary btn-sm" onClick={() => router.push(`/admin/review/${a.id}`)}>继续审稿</button>
                    )}
                  </td>
                </tr>
              ))}
              {articles.filter(a => a.statusRaw === 'closed').length > 0 && (
                <>
                  <tr><td colSpan={7} style={{ padding: '16px 0', fontSize: 13, color: '#9ca3af' }}>已完成的稿件</td></tr>
                  {articles.filter(a => a.statusRaw === 'closed').map(a => (
                    <tr key={a.id}>
                      <td className="text-sm" style={{ color: '#9ca3af' }}>{a.email}</td>
                      <td style={{ color: '#9ca3af' }}>{a.title}</td>
                      <td className="text-sm" style={{ color: '#9ca3af' }}>{a.fileName}</td>
                      <td className="text-sm" style={{ color: '#9ca3af' }}>{a.round}</td>
                      <td><span className="status status-closed">已完成</span></td>
                      <td className="text-sm" style={{ color: '#9ca3af' }}>{a.createdAt}</td>
                      <td><span className="text-sm text-muted">—</span></td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'orders' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>订单号</th><th>用户</th><th>套餐</th><th>金额</th><th>状态</th><th>支付时间</th><th>创建时间</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td className="text-sm">{o.id}</td>
                  <td className="text-sm">{o.email}</td>
                  <td>{o.plan}</td>
                  <td>¥{o.amount}</td>
                  <td><span className={`status ${o.status === '已支付' ? 'status-reviewed' : o.status === '待支付' ? 'status-pending' : 'status-closed'}`}>{o.status}</span></td>
                  <td className="text-sm">{o.paidAt}</td>
                  <td className="text-sm">{o.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'users' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>邮箱</th><th>累计消费</th><th>当前订阅</th><th>注册时间</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.email}>
                  <td className="text-sm">{u.email}</td>
                  <td className="font-bold">¥{u.totalPaid}</td>
                  <td className="text-sm">{u.subscription}</td>
                  <td className="text-sm">{u.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
