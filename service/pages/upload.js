import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import { createClient } from '@/lib/supabase-client'

export default function UploadPage() {
  const [user, setUser] = useState(null)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [canUpload, setCanUpload] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.push('/auth/login'); return }
      setUser(data.session.user)
      await checkQuota(data.session.user.id)
    })
  }, [])

  async function checkQuota(userId) {
    const [artRes, subRes] = await Promise.all([
      supabase.from('articles').select('id,order_id,subscription_id,status').eq('user_id', userId),
      supabase.from('subscriptions').select('*').eq('user_id', userId).eq('status', 'active').maybeSingle(),
    ])
    const articles = artRes.data || []
    const sub = subRes.data
    const activeCount = articles.filter(a => a.status !== 'closed').length
    const maxConcurrent = sub?.max_concurrent || 1

    if (sub) {
      if (activeCount >= maxConcurrent) {
        setCanUpload(false)
        setError(`你的套餐允许同时进行 ${maxConcurrent} 篇。请先完成当前稿件。`)
      }
    } else {
      const hasSingleCredit = articles.some(a => a.status === 'closed' && a.order_id && !a.subscription_id)
      const hasUnpaid = articles.some(a => a.order_id && !a.subscription_id && a.status !== 'closed')
      if (hasUnpaid || activeCount > 0) {
        setCanUpload(false)
        setError('单篇用户一次只能处理 1 篇稿件，请先完成当前稿件。')
      }
      if (!hasSingleCredit && activeCount === 0) {
        setCanUpload(false)
        setError('请先购买审稿服务')
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file || !title.trim()) { setError('请填写标题并选择文件'); return }
    setLoading(true)
    setError('')

    const fileName = `${Date.now()}_${file.name}`
    const filePath = `${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage.from('articles').upload(filePath, file)
    if (uploadError) { setError('上传失败: ' + uploadError.message); setLoading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('articles').getPublicUrl(filePath)

    const { error: dbError } = await supabase.from('articles').insert({
      user_id: user.id,
      title: title.trim(),
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      status: 'pending',
    })

    if (dbError) { setError('保存失败: ' + dbError.message); setLoading(false); return }

    router.push('/dashboard')
  }

  return (
    <Layout>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>上传稿件</h1>
        <p className="text-sm text-muted mb-4">支持 Word (.docx) 或 PDF 格式</p>

        {error && <div className="flash flash-error">{error}</div>}
        {!canUpload && !error && <div className="flash flash-error">上传受限</div>}

        {canUpload && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>论文标题</label>
              <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="输入论文标题" required />
            </div>
            <div className="form-group">
              <label>选择文件</label>
              <input className="form-input" type="file" accept=".docx,.pdf" onChange={e => setFile(e.target.files[0])} required style={{ padding: 8 }} />
              <p className="text-sm text-muted mt-2">格式：.docx 或 .pdf</p>
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>{loading ? '上传中...' : '提交稿件'}</button>
          </form>
        )}

        {!canUpload && (
          <div className="text-center mt-4">
            <a href="/" className="btn btn-primary">购买审稿服务</a>
            <a href="/dashboard" className="btn btn-outline" style={{ marginLeft: 12 }}>返回仪表盘</a>
          </div>
        )}
      </div>
    </Layout>
  )
}
