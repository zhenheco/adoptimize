'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
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
 * 註冊頁面
 *
 * 用戶可以透過 Email/密碼註冊新帳號
 */
export default function RegisterPage() {
  const router = useRouter()
  const t = useTranslations('register')
  const tc = useTranslations('common')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    companyName: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  /**
   * 處理輸入變更
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // 清除該欄位的錯誤
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const updated = { ...prev }
        delete updated[name]
        return updated
      })
    }
  }

  /**
   * 驗證表單
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.email) {
      errors.email = t('emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('emailInvalid')
    }

    if (!formData.password) {
      errors.password = t('passwordRequired')
    } else if (formData.password.length < 8) {
      errors.password = t('passwordMinLength')
    } else if (!/[A-Z]/.test(formData.password)) {
      errors.password = t('passwordUppercase')
    } else if (!/[a-z]/.test(formData.password)) {
      errors.password = t('passwordLowercase')
    } else if (!/[0-9]/.test(formData.password)) {
      errors.password = t('passwordNumber')
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = t('confirmRequired')
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('passwordMismatch')
    }

    if (!formData.name) {
      errors.name = t('nameRequired')
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  /**
   * 處理註冊
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          company_name: formData.companyName || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.detail?.code === 'EMAIL_ALREADY_EXISTS') {
          setFieldErrors({ email: t('emailExists') })
        } else {
          setError(data.error?.message || data.detail?.message || tc('registerFailed'))
        }
        return
      }

      // 註冊成功，跳轉到登入頁面
      router.push('/auth/login?registered=true')
    } catch (err) {
      setError(tc('serverError'))
    } finally {
      setIsLoading(false)
    }
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
          <CardTitle className="text-2xl font-bold">{t('title')}</CardTitle>
          <CardDescription className="text-base mt-2">
            {t('subtitle')}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 姓名 */}
          <div className="space-y-1">
            <Input
              type="text"
              name="name"
              placeholder={t('namePlaceholder')}
              value={formData.name}
              onChange={handleChange}
              disabled={isLoading}
              className={`h-12 ${fieldErrors.name ? 'border-red-500' : ''}`}
            />
            {fieldErrors.name && (
              <p className="text-xs text-red-600">{fieldErrors.name}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Input
              type="email"
              name="email"
              placeholder={t('emailPlaceholder')}
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              className={`h-12 ${fieldErrors.email ? 'border-red-500' : ''}`}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          {/* 公司名稱（選填） */}
          <div className="space-y-1">
            <Input
              type="text"
              name="companyName"
              placeholder={t('companyPlaceholder')}
              value={formData.companyName}
              onChange={handleChange}
              disabled={isLoading}
              className="h-12"
            />
          </div>

          {/* 密碼 */}
          <div className="space-y-1">
            <Input
              type="password"
              name="password"
              placeholder={t('passwordPlaceholder')}
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              className={`h-12 ${fieldErrors.password ? 'border-red-500' : ''}`}
            />
            {fieldErrors.password && (
              <p className="text-xs text-red-600">{fieldErrors.password}</p>
            )}
            <p className="text-xs text-gray-500">
              {t('passwordHint')}
            </p>
          </div>

          {/* 確認密碼 */}
          <div className="space-y-1">
            <Input
              type="password"
              name="confirmPassword"
              placeholder={t('confirmPasswordPlaceholder')}
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
              className={`h-12 ${fieldErrors.confirmPassword ? 'border-red-500' : ''}`}
            />
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-red-600">
                {fieldErrors.confirmPassword}
              </p>
            )}
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
            {isLoading ? tc('registering') : t('registerButton')}
          </Button>
        </form>

        {/* 登入連結 */}
        <div className="text-center text-sm">
          <span className="text-gray-500">{t('hasAccount')}</span>{' '}
          <Link
            href="/auth/login"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            {t('loginNow')}
          </Link>
        </div>

        {/* 返回首頁連結 */}
        <div className="text-center pt-4">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {tc('backToHome')}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
