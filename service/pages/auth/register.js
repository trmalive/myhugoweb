import { useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import { createClient } from '@/lib/supabase-client'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('密码至少 6 位')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { role: 'user' } },
    })

    if (signUpError) {
      setError(signUpError.message === 'User already registered' ? '该邮箱已注册' : signUpError.message)
      setLoading(false)
      return
    }

    router.push('/auth/login?registered=1')
  }

  return (
    <Layout>
      <div style={{ maxWidth: 400, margin: '60px auto' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>注册账号</h1>
        <p className="text-sm text-muted mb-4">注册后即可使用审稿服务</p>
        {error && <div className="flash flash-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>邮箱</label>
            <input className="form-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input className="form-input" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="至少 6 位" />
          </div>
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>{loading ? '注册中...' : '注册'}</button>
        </form>
        <p className="text-sm text-muted text-center mt-4">已有账号？<a href="/auth/login">登录</a></p>
      </div>
    </Layout>
  )
}
