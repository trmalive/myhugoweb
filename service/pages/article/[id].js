import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import { createClient } from '@/lib/supabase-client'

const STATUS_MAP = { pending: '待审', reviewing: '审稿中', reviewed: '已回复', closed: '已完成' }

export default function ArticleDetail() {
  const [article, setArticle] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { id } = router.query
  const supabase = createClient()

  useEffect(() => {
    if (!id) return
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.push('/auth/login'); return }
      const { data: art } = await supabase.from('articles').select('*').eq('id', id).single()
      if (!art || art.user_id !== data.session.user.id) { router.push('/dashboard'); return }
      setArticle(art)

      const { data: revs } = await supabase.from('reviews').select('*').eq('article_id', id).order('round_number', { ascending: true })
      setReviews(revs || [])
      setLoading(false)
    })
  }, [id])

  const handleConfirm = async () => {
    await supabase.from('articles').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', id)
    setArticle(prev => ({ ...prev, status: 'closed' }))
  }

  if (loading) return <Layout><p className="text-center text-muted" style={{ marginTop: 60 }}>加载中...</p></Layout>
  if (!article) return null

  return (
    <Layout>
      <a href="/dashboard" className="text-sm" style={{ display: 'inline-block', marginBottom: 16 }}>← 返回仪表盘</a>
      <div className="card mb-4">
        <div className="flex-between">
          <h1 style={{ fontSize: 20 }}>{article.title}</h1>
          <span className={`status status-${article.status}`}>{STATUS_MAP[article.status]}</span>
        </div>
        <p className="text-sm text-muted mt-2">
          上传于 {new Date(article.created_at).toLocaleString('zh-CN')}
          {article.file_name && ` · 文件: ${article.file_name}`}
        </p>
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 12 }}>审稿记录</h2>

      {reviews.length === 0 && (
        <div className="card text-center" style={{ padding: 40 }}>
          <p className="text-muted">暂无审稿记录</p>
        </div>
      )}

      {reviews.map(r => (
        <div key={r.id} className="card" style={{ marginBottom: 12 }}>
          <div className="flex-between mb-4">
            <span className="font-bold">第 {r.round_number} 轮审稿</span>
            <span className="text-sm text-muted">{new Date(r.created_at).toLocaleString('zh-CN')}</span>
          </div>
          {r.review_notes && <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{r.review_notes}</p>}
          {r.reviewer_file_name && (
            <a href={`/api/articles/download?path=${r.reviewer_file_path}`} className="btn btn-outline btn-sm mt-2" target="_blank">
              下载批注文件 ({r.reviewer_file_name})
            </a>
          )}
        </div>
      ))}

      {article.status === 'reviewed' && (
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button className="btn btn-success btn-lg" style={{ flex: 1 }} onClick={handleConfirm}>
            ✓ 确认完成 — 问题已解决
          </button>
          <button className="btn btn-outline btn-lg" style={{ flex: 1 }} onClick={async () => {
            await fetch('/api/articles/request-revision', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ articleId: id }),
            })
            setArticle(prev => ({ ...prev, status: 'reviewing' }))
          }}>
            ↻ 需要继续修改
          </button>
        </div>
      )}
    </Layout>
  )
}
