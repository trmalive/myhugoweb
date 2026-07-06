import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'

export default function Layout({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription?.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="layout">
      <nav className="navbar">
        <a href="/" className="navbar-brand">📋 审稿服务</a>
        <div className="navbar-nav">
          <a href="/">首页</a>
          {!loading && !user && (
            <>
              <a href="/auth/login">登录</a>
              <a href="/auth/register">注册</a>
            </>
          )}
          {!loading && user && (
            <>
              <a href="/dashboard">我的稿件</a>
              <a href="/upload">上传稿件</a>
              <button onClick={handleLogout}>退出 ({user.email})</button>
            </>
          )}
        </div>
      </nav>
      <main className="main">{children}</main>
    </div>
  )
}
