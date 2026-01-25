'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

  // 錯誤狀態（全螢幕風格）
  if (status === 'error') {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center px-4">
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
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">登入失敗</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <a
            href="/auth/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            返回登入頁面
          </a>
        </div>
      </div>
    )
  }

  // 處理中或成功狀態（全螢幕無縫 loading）
  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
          <svg
            className="animate-spin h-10 w-10 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          正在登入...
        </p>
      </div>
    </div>
  )
}
