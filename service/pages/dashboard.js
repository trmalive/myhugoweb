import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import { createClient } from '@/lib/supabase-client'

const STATUS_MAP = { pending: '待审', reviewing: '审稿中', reviewed: '已回复', closed: '已完成' }

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [articles, setArticles] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.push('/auth/login'); return }
      setUser(data.session.user)

      const [artRes, subRes] = await Promise.all([
        supabase.from('articles').select('*').eq('user_id', data.session.user.id).order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('*').eq('user_id', data.session.user.id).eq('status', 'active').maybeSingle(),
      ])
      setArticles(artRes.data || [])
      setSubscription(subRes.data)
      setLoading(false)
    })
  }, [])

  const handleConfirm = async (articleId) => {
    const { error } = await supabase
      .from('articles').update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', articleId)
    if (!error) {
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, status: 'closed' } : a))
    }
  }

  if (loading) return <Layout><p className="text-center text-muted" style={{ marginTop: 60 }}>加载中...</p></Layout>

  const activeCount = articles.filter(a => a.status !== 'closed').length
  const maxConcurrent = subscription?.max_concurrent || 1
  const canUpload = subscription ? activeCount < maxConcurrent : !!articles.find(a => a.order_id && !a.subscription_id && a.status === 'closed') || activeCount === 0

  return (
    <Layout>
      <div className="flex-between mb-4">
        <h1 style={{ fontSize: 24 }}>我的稿件</h1>
        <a href="/upload" className="btn btn-primary btn-sm">+ 上传新稿件</a>
      </div>

      {subscription && (
        <div className="card mb-4" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <span className="font-bold">包月 {subscription.plan_type} — </span>
          <span className="text-sm">有效期至 {new Date(subscription.end_date).toLocaleDateString('zh-CN')}</span>
          <span className="text-sm" style={{ marginLeft: 16 }}> | 同时进行: {activeCount}/{maxConcurrent}</span>
        </div>
      )}

      {!subscription && articles.filter(a => a.type === 'single' && a.status === 'paid' && !a.article_id).length > 0 && (
        <div className="card mb-4" style={{ background: '#fef3c7', borderColor: '#fde68a' }}>
          <span className="font-bold">你有单篇审稿额度可用</span>
        </div>
      )}

      {articles.length === 0 ? (
        <div className="card text-center" style={{ padding: 60 }}>
          <p className="text-muted">还没有稿件，上传你的第一篇论文吧</p>
          <a href="/upload" className="btn btn-primary mt-4">上传稿件</a>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>标题</th><th>上传时间</th><th>审稿轮次</th><th>状态</th><th>操作</th></tr>
            </thead>
            <tbody>
              {articles.map(a => (
                <tr key={a.id}>
                  <td><a href={`/article/${a.id}`}>{a.title}</a></td>
                  <td className="text-sm">{new Date(a.created_at).toLocaleDateString('zh-CN')}</td>
                  <td className="text-sm">{a.current_round} 轮</td>
                  <td><span className={`status status-${a.status}`}>{STATUS_MAP[a.status]}</span></td>
                  <td>
                    <a href={`/article/${a.id}`} className="btn btn-outline btn-sm">查看</a>
                    {a.status === 'reviewed' && (
                      <button className="btn btn-success btn-sm" style={{ marginLeft: 8 }} onClick={() => handleConfirm(a.id)}>确认完成</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
