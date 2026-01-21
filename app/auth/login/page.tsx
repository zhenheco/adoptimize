'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Facebook App ID
const FB_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || '1336497714898181'

// 聲明 FB SDK 全域類型（包含我們的初始化標記）
declare global {
  interface Window {
    FB?: {
      init: (params: {
        appId: string
        cookie?: boolean
        xfbml?: boolean
        version: string
      }) => void
      login: (
        callback: (response: {
          authResponse?: { accessToken: string }
          status?: string
        }) => void,
        options?: { scope: string }
      ) => void
      getLoginStatus: (
        callback: (response: {
          status: string
          authResponse?: { accessToken: string }
        }) => void
      ) => void
    }
    fbAsyncInit?: () => void
    // 使用 window 物件存儲初始化狀態，確保跨模組共享
    __fbInitCalled?: boolean
    // 用於通知 React 組件 SDK 已就緒
    __fbSdkReadyCallbacks?: Array<() => void>
  }
}

/**
 * 在模組載入時設定 fbAsyncInit（在 React 組件之外）
 * 這確保 fbAsyncInit 只被設定一次，不受 React Strict Mode 影響
 */
if (typeof window !== 'undefined' && !window.__fbInitCalled) {
  // 初始化回調陣列
  if (!window.__fbSdkReadyCallbacks) {
    window.__fbSdkReadyCallbacks = []
  }

  // 只有在 fbAsyncInit 尚未設定時才設定
  // 檢查是否已經有我們的初始化函數
  const existingInit = window.fbAsyncInit
  if (!existingInit || !(existingInit as unknown as { __isOurInit?: boolean }).__isOurInit) {
    const initFunction = () => {
      // 防止多次呼叫
      if (window.__fbInitCalled) {
        console.log('[模組] fbAsyncInit: 已初始化過，跳過')
        return
      }

      // 立即鎖定，防止競態條件
      window.__fbInitCalled = true

      if (window.FB && typeof window.FB.init === 'function') {
        try {
          console.log('[模組] fbAsyncInit: 正在呼叫 FB.init()...')
          window.FB.init({
            appId: FB_APP_ID,
            cookie: true,
            xfbml: true,
            version: 'v18.0',
          })
          console.log('[模組] fbAsyncInit: Facebook SDK 初始化成功')

          // 通知所有等待的回調
          if (window.__fbSdkReadyCallbacks) {
            window.__fbSdkReadyCallbacks.forEach(cb => cb())
            window.__fbSdkReadyCallbacks = []
          }
        } catch (initError) {
          window.__fbInitCalled = false
          console.error('[模組] fbAsyncInit: Facebook SDK init 失敗:', initError)
        }
      }
    }

    // 標記這是我們的初始化函數
    ;(initFunction as unknown as { __isOurInit?: boolean }).__isOurInit = true
    window.fbAsyncInit = initFunction
    console.log('[模組] fbAsyncInit 已設定')
  }
}

/**
 * 登入頁面
 *
 * 支援：
 * - Email/密碼登入
 * - Google OAuth 登入
 * - Meta OAuth 登入
 */
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'meta' | null>(null)
  const [mounted, setMounted] = useState(false)
  const [fbSdkReady, setFbSdkReady] = useState(false)

  /**
   * 檢查 Facebook SDK 是否已經初始化
   */
  const isFbInitialized = useCallback((): boolean => {
    return window.__fbInitCalled === true
  }, [])

  // 確保組件已掛載（客戶端渲染完成）
  useEffect(() => {
    setMounted(true)

    // 從 URL 參數讀取錯誤訊息（使用純客戶端 URLSearchParams）
    const params = new URLSearchParams(window.location.search)
    const urlError = params.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }

    // 檢查 SDK 是否已經初始化
    if (isFbInitialized()) {
      console.log('[組件] useEffect: FB SDK 已初始化')
      setFbSdkReady(true)
    } else {
      // 註冊回調，等待 SDK 初始化完成
      console.log('[組件] useEffect: 註冊 SDK 就緒回調')
      if (!window.__fbSdkReadyCallbacks) {
        window.__fbSdkReadyCallbacks = []
      }
      const callback = () => {
        console.log('[組件] SDK 就緒回調被觸發')
        setFbSdkReady(true)
      }
      window.__fbSdkReadyCallbacks.push(callback)

      // Cleanup: 移除回調
      return () => {
        if (window.__fbSdkReadyCallbacks) {
          const index = window.__fbSdkReadyCallbacks.indexOf(callback)
          if (index > -1) {
            window.__fbSdkReadyCallbacks.splice(index, 1)
          }
        }
      }
    }
  }, [isFbInitialized])

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

      if (!response.ok) {
        const errorMsg = data.error?.message || data.detail?.message || data.error || '無法啟動 Google 登入'
        setError(errorMsg)
        setOauthLoading(null)
        return
      }

      if (!data.auth_url) {
        setError('Google OAuth 設定錯誤，請聯絡管理員')
        setOauthLoading(null)
        return
      }

      // 重定向到 Google OAuth 授權頁面
      window.location.href = data.auth_url
    } catch (err) {
      console.error('Google 登入錯誤:', err)
      setError('無法連接到伺服器，請稍後再試')
      setOauthLoading(null)
    }
  }

  /**
   * 處理 Meta 登入
   * 使用 Facebook JavaScript SDK
   * 注意：FB.login 只能在 HTTPS 頁面上使用
   */
  const handleMetaLogin = async () => {
    setError(null)
    setOauthLoading('meta')

    // 檢查是否在 HTTPS 環境（Facebook SDK 要求）
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:') {
      // 本地開發環境不支援 FB.login，顯示提示訊息
      setError('Meta 登入需要 HTTPS 環境。請使用正式網站登入，或使用 Google 帳號登入。')
      setOauthLoading(null)
      return
    }

    // 檢查 Facebook SDK 是否可用
    if (!window.FB) {
      setError('Facebook SDK 尚未載入，請稍候或重新整理頁面')
      setOauthLoading(null)
      return
    }

    // 檢查 SDK 是否已初始化
    if (!isFbInitialized()) {
      console.log('[組件] handleMetaLogin: SDK 未初始化')
      setError('Facebook SDK 初始化失敗，請重新整理頁面後再試')
      setOauthLoading(null)
      return
    }

    try {
      window.FB.login(
        (response) => {
          // 注意：FB.login callback 不能是 async function
          // 所以我們在裡面呼叫一個 async 函數
          console.log('FB.login response:', response)

          if (response.authResponse) {
            // 使用 access token 登入後端
            const { accessToken } = response.authResponse
            console.log('Got Facebook accessToken, calling backend...')

            // 呼叫 async 處理函數
            handleFacebookLoginSuccess(accessToken)
          } else if (response.status === 'not_authorized') {
            // 用戶沒有授權 App
            setError('請授權應用程式以繼續登入')
            setOauthLoading(null)
          } else {
            // 用戶取消登入或沒有登入 Facebook
            setError('Meta 登入已取消')
            setOauthLoading(null)
          }
        },
        { scope: 'email,public_profile' }
      )
    } catch (err: unknown) {
      // 詳細記錄錯誤資訊以便除錯
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('Meta 登入錯誤:', err)
      console.error('錯誤詳情:', errorMessage)

      // 根據錯誤類型顯示不同訊息
      if (errorMessage.includes('popup') || errorMessage.includes('blocked')) {
        setError('彈窗被瀏覽器阻擋，請允許彈窗後重試')
      } else {
        setError('Meta 登入失敗：' + errorMessage)
      }
      setOauthLoading(null)
    }
  }

  /**
   * 處理 Facebook 登入成功後的後端驗證
   */
  const handleFacebookLoginSuccess = async (accessToken: string) => {
    // 使用 AbortController 設定 15 秒 timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const loginResponse = await fetch('/api/v1/auth/oauth/meta/sdk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: accessToken }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log('Backend response status:', loginResponse.status)

      // 檢查 content-type 是否為 JSON
      const contentType = loginResponse.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Unexpected content-type:', contentType)
        setError('伺服器回應格式錯誤，可能是 CORS 或配置問題')
        setOauthLoading(null)
        return
      }

      const data = await loginResponse.json()
      console.log('Backend response data:', data)

      if (!loginResponse.ok) {
        // 區分不同錯誤類型
        let errorMsg = 'Meta 登入失敗'

        if (loginResponse.status === 500) {
          // 伺服器錯誤 - 可能是配置問題
          errorMsg = data.detail || '伺服器內部錯誤，請檢查 META_APP_SECRET 是否已配置'
        } else if (loginResponse.status === 401 || loginResponse.status === 403) {
          // 授權錯誤
          errorMsg = data.detail || 'Meta 授權失敗，請重試'
        } else if (loginResponse.status === 400) {
          // 請求錯誤
          errorMsg = data.detail || '無效的請求，請重新登入'
        } else {
          errorMsg = data.error?.message || data.detail?.message || data.detail || data.error || errorMsg
        }

        setError(errorMsg)
        setOauthLoading(null)
        return
      }

      // 存儲 access token 到 localStorage
      if (data.data?.access_token) {
        localStorage.setItem('access_token', data.data.access_token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
      }

      // 跳轉到 dashboard
      router.push('/dashboard')
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)

      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        setError('連線逾時，請檢查網路連線後重試')
      } else {
        console.error('Fetch error:', fetchErr)
        setError('無法連接到伺服器，請檢查網路連線')
      }
      setOauthLoading(null)
    }
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
    <>
      {/* Facebook SDK - 使用 async 載入方式
          注意：SDK 會在載入完成後自動呼叫 window.fbAsyncInit
          我們在 useEffect 中設定了 fbAsyncInit */}
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Facebook SDK script loaded')
          // 不要在這裡呼叫 initFacebookSdk()
          // 讓 fbAsyncInit 處理初始化（官方推薦方式）
          // 只更新 React state 表示 SDK 已載入
          if (window.__fbInitCalled) {
            console.log('Script onLoad: SDK 已由 fbAsyncInit 初始化')
            setFbSdkReady(true)
          }
        }}
        onError={(e) => {
          console.error('Facebook SDK 載入失敗:', e)
        }}
      />

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

      {/* Meta 登入按鈕 */}
      <Button
        variant="outline"
        className="w-full h-12 text-base font-medium relative"
        onClick={handleMetaLogin}
        disabled={isLoading || oauthLoading === 'meta'}
      >
        <div className="absolute left-4 w-6 h-6 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </div>
        使用 Meta 帳號登入
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
    </>
  )
}
