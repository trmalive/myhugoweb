import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import { createClient } from '@/lib/supabase-client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (router.query.registered) setError('注册成功，请登录')
  }, [router.query])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message === 'Invalid login credentials' ? '邮箱或密码错误' : signInError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <Layout>
      <div style={{ maxWidth: 400, margin: '60px auto' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>登录</h1>
        <p className="text-sm text-muted mb-4">登录后管理你的稿件</p>
        {error && <div className="flash flash-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>邮箱</label>
            <input className="form-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input className="form-input" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="输入密码" />
          </div>
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>{loading ? '登录中...' : '登录'}</button>
        </form>
        <p className="text-sm text-muted text-center mt-4">没有账号？<a href="/auth/register">注册</a></p>
      </div>
    </Layout>
  )
}
