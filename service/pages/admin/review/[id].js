import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import { createClient } from '@/lib/supabase-client'

export default function ReviewPage() {
  const [article, setArticle] = useState(null)
  const [reviews, setReviews] = useState([])
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const { id } = router.query
  const supabase = createClient()

  useEffect(() => {
    if (!id) return
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.push('/auth/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single()
      if (profile?.role !== 'admin') { router.push('/dashboard'); return }

      const { data: art } = await supabase.from('articles').select('*').eq('id', id).single()
      if (!art) { router.push('/admin'); return }
      setArticle(art)

      if (art.status === 'pending') {
        await supabase.from('articles').update({ status: 'reviewing' }).eq('id', id)
        setArticle(prev => ({ ...prev, status: 'reviewing' }))
      }

      const { data: revs } = await supabase.from('reviews').select('*').eq('article_id', id).order('round_number', { ascending: true })
      setReviews(revs || [])
      setLoading(false)
    })
  }, [id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!notes.trim() && !file) { setError('请填写审稿意见或上传批注文件'); return }
    setSubmitting(true)
    setError('')

    let reviewerFilePath = null
    let reviewerFileName = null

    if (file) {
      const fileName = `review_${Date.now()}_${file.name}`
      const filePath = `reviews/${id}/${fileName}`
      const { error: uploadError } = await supabase.storage.from('articles').upload(filePath, file)
      if (uploadError) { setError('文件上传失败: ' + uploadError.message); setSubmitting(false); return }
      reviewerFilePath = filePath
      reviewerFileName = file.name
    }

    const res = await fetch('/api/reviews/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId: id, reviewNotes: notes, reviewerFilePath, reviewerFileName }),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error); setSubmitting(false); return }

    setSuccess(`第 ${data.round} 轮审稿已提交`)
    setNotes('')
    setFile(null)
    setArticle(prev => ({ ...prev, status: 'reviewed', current_round: data.round }))

    const { data: revs } = await supabase.from('reviews').select('*').eq('article_id', id).order('round_number', { ascending: true })
    setReviews(revs || [])
    setSubmitting(false)
  }

  if (loading) return <Layout><p className="text-center text-muted" style={{ marginTop: 60 }}>加载中...</p></Layout>
  if (!article) return null

  return (
    <Layout>
      <a href="/admin" className="text-sm" style={{ display: 'inline-block', marginBottom: 16 }}>← 返回管理后台</a>

      <div className="card mb-4">
        <div className="flex-between">
          <div>
            <h1 style={{ fontSize: 20 }}>{article.title}</h1>
            <p className="text-sm text-muted mt-2">
              上传者: {article.user_id?.slice(0, 8)} | 文件: {article.file_name} | 当前轮次: {article.current_round}
            </p>
          </div>
          <span className={`status status-${article.status}`}>
            {article.status === 'pending' ? '待审' : article.status === 'reviewing' ? '审稿中' : article.status === 'reviewed' ? '已回复' : '已完成'}
          </span>
        </div>
        {article.file_path && (
          <a href={`/api/articles/download?path=${article.file_path}`} className="btn btn-outline btn-sm mt-4" target="_blank">
            下载用户上传的原始文件
          </a>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">历史审稿记录</div>
          {reviews.map(r => (
            <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
              <div className="flex-between">
                <span className="font-bold">第 {r.round_number} 轮</span>
                <span className="text-sm text-muted">{new Date(r.created_at).toLocaleString('zh-CN')}</span>
              </div>
              {r.review_notes && <p style={{ whiteSpace: 'pre-wrap', marginTop: 8, lineHeight: 1.6, fontSize: 14 }}>{r.review_notes}</p>}
              {r.reviewer_file_name && (
                <a href={`/api/articles/download?path=${r.reviewer_file_path}`} className="text-sm" target="_blank">
                  下载批注文件: {r.reviewer_file_name}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header">提交审稿意见 — 第 {(article.current_round || 0) + 1} 轮</div>
        {success && <div className="flash flash-success">{success}</div>}
        {error && <div className="flash flash-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>审稿意见</label>
            <textarea
              className="form-input"
              rows={8}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="输入审稿意见..."
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="form-group">
            <label>上传批注文件（可选）</label>
            <input className="form-input" type="file" accept=".docx,.pdf" onChange={e => setFile(e.target.files[0])} style={{ padding: 8 }} />
            <p className="text-sm text-muted mt-2">支持 .docx 或 .pdf 格式</p>
          </div>
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? '提交中...' : '提交审稿意见'}
          </button>
        </form>
      </div>
    </Layout>
  )
}
