'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
} from '@/components/ui/card'

/**
 * OAuth Callback 中間頁面
 *
 * 從 URL 參數讀取 access_token 並存入 localStorage，
 * 然後重定向到 dashboard
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')

  useEffect(() => {
    const processCallback = async () => {
      try {
        // 從 URL 參數讀取 token
        const params = new URLSearchParams(window.location.search)
        const accessToken = params.get('access_token')
        const userJson = params.get('user')
        const errorParam = params.get('error')

        // 處理錯誤情況
        if (errorParam) {
          setError(decodeURIComponent(errorParam))
          setStatus('error')
          return
        }

        // 檢查是否有 token
        if (!accessToken) {
          setError('未收到認證 token，請重新登入')
          setStatus('error')
          return
        }

        // 存入 localStorage
        localStorage.setItem('access_token', accessToken)

        // 存入 user 資訊（如果有）
        if (userJson) {
          try {
            const user = JSON.parse(decodeURIComponent(userJson))
            localStorage.setItem('user', JSON.stringify(user))
          } catch {
            // 解析失敗時忽略，至少 token 已存
            console.warn('無法解析 user 資訊')
          }
        }

        setStatus('success')

        // 清除 URL 中的 token（安全考量）並重定向到 dashboard
        // 使用 replace 避免在瀏覽歷史中留下帶 token 的 URL
        router.replace('/dashboard')
      } catch (err) {
        console.error('處理 OAuth callback 時發生錯誤:', err)
        setError('處理認證時發生錯誤，請重新登入')
        setStatus('error')
      }
    }

    processCallback()
  }, [router])

  // 錯誤狀態
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md mx-4 shadow-xl">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">登入失敗</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <a
              href="/auth/login"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回登入頁面
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 處理中或成功狀態（顯示 loading）
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md mx-4 shadow-xl">
        <CardContent className="pt-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <h2 className="text-xl font-semibold mb-2">正在完成登入...</h2>
          <p className="text-gray-600 dark:text-gray-400">
            請稍候，即將跳轉到控制台
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
