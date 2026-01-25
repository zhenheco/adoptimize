/**
 * 統一環境變數配置
 *
 * 所有環境變數都在此集中處理，確保：
 * 1. 自動 trim() 移除空白和換行符
 * 2. 提供預設值
 * 3. 類型安全
 */

function getEnv(key: string, defaultValue = ''): string {
  if (typeof process === 'undefined') return defaultValue
  const value = process.env[key]
  return value?.trim() || defaultValue
}

function getEnvRequired(key: string): string {
  const value = getEnv(key)
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function getEnvBoolean(key: string, defaultValue = false): boolean {
  const value = getEnv(key)
  if (!value) return defaultValue
  return value.toLowerCase() === 'true'
}

/**
 * API 配置
 */
export const API_CONFIG = {
  /** Python 後端 API URL */
  PYTHON_API_URL: getEnv('PYTHON_API_URL', 'http://localhost:8000'),
  /** Next.js API 基礎路徑 */
  NEXT_PUBLIC_API_BASE: getEnv('NEXT_PUBLIC_API_BASE', '/api/v1'),
} as const

/**
 * OAuth 配置
 */
export const OAUTH_CONFIG = {
  /** Meta App ID */
  META_APP_ID: getEnv('NEXT_PUBLIC_META_APP_ID'),
  /** Google Client ID */
  GOOGLE_CLIENT_ID: getEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID'),
} as const

/**
 * 功能開關
 */
export const FEATURE_FLAGS = {
  /** 是否啟用開發模式 */
  IS_DEVELOPMENT: getEnv('NODE_ENV') === 'development',
  /** 是否啟用調試日誌 */
  DEBUG_ENABLED: getEnvBoolean('DEBUG_ENABLED'),
} as const

/**
 * 取得 Python API URL（帶 trim）
 */
export function getPythonApiUrl(): string {
  return API_CONFIG.PYTHON_API_URL
}

export default {
  API_CONFIG,
  OAUTH_CONFIG,
  FEATURE_FLAGS,
  getPythonApiUrl,
}
