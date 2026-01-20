'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * 登入頁面
 *
 * 支援：
 * - Email/密碼登入
 * - Google OAuth 登入
 * - Meta OAuth 登入（目前停用）
 */
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'meta' | null>(null)
  const [mounted, setMounted] = useState(false)

  // 確保組件已掛載（客戶端渲染完成）
  useEffect(() => {
    setMounted(true)

    // 從 URL 參數讀取錯誤訊息（使用純客戶端 URLSearchParams）
    const params = new URLSearchParams(window.location.search)
    const urlError = params.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }
  }, [])

  /**
   * 處理 Email/密碼登入
   */
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || data.detail?.message || '登入失敗')
        return
      }

      // 存儲 access token 到 localStorage
      if (data.data?.access_token) {
        localStorage.setItem('access_token', data.data.access_token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
      }

      // 跳轉到 dashboard
      router.push('/dashboard')
    } catch (err) {
      setError('無法連接到伺服器，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 處理 Google 登入
   * 透過後端取得 OAuth 授權 URL 並重定向
   */
  const handleGoogleLogin = async () => {
    setError(null)
    setOauthLoading('google')

    try {
      const response = await fetch('/api/v1/auth/oauth/google')
      const data = await response.json()

      if (!response.ok || !data.auth_url) {
        setError(data.error || '無法啟動 Google 登入')
        setOauthLoading(null)
        return
      }

      // 重定向到 Google OAuth 授權頁面
      window.location.href = data.auth_url
    } catch (err) {
      setError('無法連接到伺服器，請稍後再試')
      setOauthLoading(null)
    }
  }

  /**
   * 處理 Meta 登入
   * 目前停用，等待修復 Facebook SDK 問題
   */
  const handleMetaLogin = async () => {
    setError('Meta 登入功能維護中，請使用其他登入方式')
  }

  // 還未掛載時顯示 loading
  if (!mounted) {
    return (
      <Card className="w-full max-w-md mx-4 shadow-xl">
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-4 shadow-xl">
      <CardHeader className="text-center space-y-4">
      {/* Logo */}
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-2xl">AO</span>
        </div>
      </div>

      <div>
        <CardTitle className="text-2xl font-bold">
          歡迎使用廣告船長
        </CardTitle>
        <CardDescription className="text-base mt-2">
          跨平台廣告優化工具
        </CardDescription>
      </div>
    </CardHeader>

    <CardContent className="space-y-4">
      {/* Email/密碼登入表單 */}
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="h-12"
          />
        </div>
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            className="h-12"
          />
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 text-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-12 text-base font-medium"
          disabled={isLoading}
        >
          {isLoading ? '登入中...' : '登入'}
        </Button>
      </form>

      {/* 註冊連結 */}
      <div className="text-center text-sm">
        <span className="text-gray-500">還沒有帳號？</span>{' '}
        <Link
          href="/auth/register"
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
        >
          立即註冊
        </Link>
      </div>

      {/* 分隔線 */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
            或使用平台帳號
          </span>
        </div>
      </div>

      {/* Google 登入按鈕 */}
      <Button
        variant="outline"
        className="w-full h-12 text-base font-medium relative"
        onClick={handleGoogleLogin}
        disabled={isLoading || oauthLoading === 'google'}
      >
        <div className="absolute left-4 w-6 h-6 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        </div>
        使用 Google 帳號登入
      </Button>

      {/* Meta 登入按鈕 - 暫時停用 */}
      <Button
        variant="outline"
        className="w-full h-12 text-base font-medium relative"
        onClick={handleMetaLogin}
        disabled={true}
      >
        <div className="absolute left-4 w-6 h-6 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </div>
        使用 Meta 帳號登入（維護中）
      </Button>

      {/* 返回首頁連結 */}
      <div className="text-center pt-4">
        <Link
          href="/"
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          返回首頁
        </Link>
      </div>
    </CardContent>
  </Card>
  )
}
