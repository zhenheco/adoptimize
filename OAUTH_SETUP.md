# OAuth 環境變數配置指南

## 📋 問題說明

目前 Google OAuth 返回 500 錯誤，因為後端缺少 Google OAuth 的環境變數配置。

## 🔧 Zeabur 後端配置

### 1. 登入 Zeabur
- 訪問 https://zeabur.com
- 進入你的 adoptimize-api 專案

### 2. 配置環境變數

在 Zeabur 專案設定中添加以下環境變數：

#### Google OAuth 用戶登入
```bash
GOOGLE_CLIENT_ID=你的Google Client ID
GOOGLE_CLIENT_SECRET=你的Google Client Secret
```

#### Meta OAuth（已存在）
```bash
META_APP_ID=1336497714898181
META_APP_SECRET=你的Meta App Secret
```

### 3. 重新部署

配置環境變數後，需要重新部署後端服務：
- 在 Zeabur 控制台點擊 "Redeploy"
- 或使用 CLI: `zeabur restart`

## ✅ 驗證配置

部署完成後，測試 API：

```bash
# 測試 Google OAuth 端點
curl http://adoptimize-api.zeabur.app/api/v1/auth/oauth/google?redirect_uri=http://localhost:3000/api/v1/auth/oauth/google/callback

# 預期回應（成功）:
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "..."
}

# 預期回應（失敗 - 未配置）:
{
  "detail": {
    "code": "OAUTH_NOT_CONFIGURED",
    "message": "Google OAuth 尚未配置"
  }
}
```

## 🌱 本地開發配置

在 `backend/.env` 中添加：

```bash
# Google OAuth 用戶登入
GOOGLE_CLIENT_ID=你的Google Client ID
GOOGLE_CLIENT_SECRET=你的Google Client Secret

# Meta OAuth
META_APP_ID=你的Meta App ID
META_APP_SECRET=你的Meta App Secret
```

## 📝 注意事項

1. **不要將 `.env` 檔案提交到 Git**（已加入 `.gitignore`）
2. **生產環境和開發環境使用不同的 Google Client ID**（建議）
3. **Meta OAuth 目前使用 Facebook JavaScript SDK**，不需要 redirect URI 配置

## 🔍 當前狀態

- ✅ 前端已部署並改善錯誤處理
- ✅ Meta 登入已啟用（使用 Facebook SDK）
- ⏸️ Google 登入等待後端環境變數配置
- ✅ Email/密碼登入正常運作

## 🚀 下一步

1. 在 Zeabur 配置上述環境變數
2. 重新部署後端服務
3. 測試 Google OAuth 登入流程
