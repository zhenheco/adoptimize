/**
 * 統一日誌服務
 * 在開發環境輸出到 console，生產環境可對接外部服務
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

const isDevelopment = process.env.NODE_ENV === 'development'
const isServer = typeof window === 'undefined'

/**
 * 格式化日誌訊息
 */
function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const prefix = isServer ? `[${timestamp}] [${level.toUpperCase()}]` : `[${level.toUpperCase()}]`

  if (context && Object.keys(context).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(context)}`
  }
  return `${prefix} ${message}`
}

/**
 * 日誌服務
 * - 開發環境：輸出到 console
 * - 生產環境：僅輸出 warn 和 error（可擴展對接外部服務）
 */
export const logger = {
  debug(message: string, context?: LogContext): void {
    if (isDevelopment) {
      console.debug(formatMessage('debug', message, context))
    }
  },

  info(message: string, context?: LogContext): void {
    if (isDevelopment) {
      console.info(formatMessage('info', message, context))
    }
    // 生產環境可在此對接外部日誌服務
  },

  warn(message: string, context?: LogContext): void {
    console.warn(formatMessage('warn', message, context))
    // 生產環境可在此對接外部監控服務
  },

  error(message: string, error?: unknown, context?: LogContext): void {
    const errorContext: LogContext = { ...context }

    if (error instanceof Error) {
      errorContext.errorName = error.name
      errorContext.errorMessage = error.message
      if (isDevelopment) {
        errorContext.stack = error.stack
      }
    } else if (error !== undefined) {
      errorContext.error = error
    }

    console.error(formatMessage('error', message, errorContext))
    // 生產環境可在此對接 Sentry 等錯誤追蹤服務
  },
}

export default logger
