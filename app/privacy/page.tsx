import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy / 隱私政策 - AdOptimize',
  description:
    'AdOptimize Privacy Policy including data collection, Google API usage, and user rights.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            &larr; Back to Home / 返回首頁
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
            Privacy Policy / 隱私政策
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Last Updated: March 7, 2026 / 最後更新日期：2026 年 3 月 7 日
          </p>
          <div className="mt-4 flex gap-4">
            <a
              href="#english"
              className="text-sm text-blue-600 hover:underline"
            >
              English Version
            </a>
            <span className="text-gray-300">|</span>
            <a
              href="#chinese"
              className="text-sm text-blue-600 hover:underline"
            >
              中文版本
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 space-y-12">
          {/* ==================== English Version ==================== */}
          <section
            id="english"
            className="space-y-8 border-b border-gray-100 dark:border-gray-700 pb-12"
          >
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 underline decoration-blue-500 underline-offset-8">
                Privacy Policy (English)
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                AdOptimize (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is
                committed to protecting your privacy. This Privacy Policy
                explains how we collect, use, and safeguard your information
                when you use our cross-platform advertising optimization
                service, which integrates with Google Ads and Meta
                (Facebook/Instagram) advertising platforms.
              </p>
            </div>

            {/* Google API Limited Use Disclosure */}
            <div className="p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
                Google API Disclosure (Limited Use Policy)
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                AdOptimize&apos;s use and transfer to any other app of
                information received from Google APIs will adhere to the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements. We do not use your
                Google Ads data to train AI/ML models.
              </p>
            </div>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Data Collection
              </h3>
              <p className="mb-2 text-gray-700 dark:text-gray-300">
                We collect the following types of information:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  <strong>Account Information:</strong> Name, email address, and
                  encrypted credentials.
                </li>
                <li>
                  <strong>Advertising Data:</strong> When you connect Google Ads
                  or Meta Ads, we access campaign performance data (impressions,
                  clicks, conversions, spend), creative assets, and audience
                  settings via their official APIs.
                </li>
                <li>
                  <strong>Usage Data:</strong> Login history, feature usage,
                  browser type, and device information.
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Use of Data
              </h3>
              <p className="mb-2 text-gray-700 dark:text-gray-300">
                We use your data to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  Provide AI-driven optimization suggestions for your ad
                  campaigns.
                </li>
                <li>
                  Generate consolidated performance reports across different
                  platforms.
                </li>
                <li>Manage your account and subscription.</li>
                <li>
                  Monitor and prevent unauthorized access or fraudulent
                  activities.
                </li>
                <li>
                  Send important service notifications or product updates (you
                  may opt out).
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Data Sharing, Transfer, and Disclosure
              </h3>
              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                <p>
                  <strong>
                    We do not sell your personal data or Google User Data to
                    third parties.
                  </strong>
                </p>
                <p>
                  Data is shared only with essential infrastructure providers
                  (Supabase for database hosting, Vercel for frontend hosting,
                  Fly.io for backend hosting) to operate the service. These
                  providers are prohibited from using your data for their own
                  purposes.
                </p>
                <p>
                  We may disclose your data when required by applicable laws,
                  legal processes, or legitimate government requests.
                </p>
                <p>We will never:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Sell or rent your personal data or Google User Data</li>
                  <li>Use Google User Data to serve you ads</li>
                  <li>
                    Share Google User Data with unrelated third parties
                  </li>
                  <li>
                    Allow human reading of Google User Data without your
                    explicit consent, except for security purposes, legal
                    compliance, or when data has been anonymized
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Data Security
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                All data transfers are encrypted via TLS/SSL. Sensitive tokens
                (such as OAuth tokens) are stored using AES-256 encryption.
                Databases are hosted in cloud environments with strict access
                controls. We perform regular security audits to ensure your data
                remains protected.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Data Retention
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                We retain your data while you use the service. If you delete
                your account, we will delete your personal data within 30 days,
                unless legally required to retain it longer.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Cookies
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                We use cookies and similar technologies to maintain your login
                session, remember your preferences, and analyze service usage.
                You may manage cookies through your browser settings.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Your Rights
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  <strong>Access:</strong> Request to view your personal data we
                  hold.
                </li>
                <li>
                  <strong>Correction:</strong> Request correction of inaccurate
                  data.
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your personal
                  data.
                </li>
                <li>
                  <strong>Portability:</strong> Request export of your data in a
                  machine-readable format.
                </li>
                <li>
                  <strong>Withdraw Consent:</strong> Withdraw consent for data
                  processing at any time.
                </li>
                <li>
                  <strong>Disconnect:</strong> Disconnect your advertising
                  platform accounts at any time.
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Changes to This Policy
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                We may update this Privacy Policy from time to time. For
                significant changes, we will notify you via email or in-app
                notification. We recommend reviewing this policy periodically.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Contact Information
              </h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                <p>
                  <strong>Entity:</strong> AdOptimize Operations Team
                </p>
                <p>
                  <strong>Email:</strong>{' '}
                  <a
                    href="mailto:privacy@adoptimize.com"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    privacy@adoptimize.com
                  </a>
                </p>
                <p>
                  <strong>Address:</strong> 7F., No. 123, Sec. 3, Nanjing E.
                  Rd., Zhongshan Dist., Taipei City 104, Taiwan
                </p>
              </div>
            </section>
          </section>

          {/* ==================== Chinese Version ==================== */}
          <section id="chinese">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              隱私政策 (中文版本)
            </h2>
            <div className="space-y-8">
              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  1. 簡介
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  AdOptimize（以下簡稱「本服務」）是一個跨平台廣告優化工具，致力於幫助用戶管理和優化其
                  Google Ads 和
                  Meta（Facebook/Instagram）廣告活動。我們非常重視您的隱私，本政策說明我們如何收集、使用、保護您的個人資料。
                </p>
              </section>

              {/* Google API 聲明 */}
              <div className="p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl border-l-4">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  Google API 資料使用聲明（有限使用政策）
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                  AdOptimize 使用從 Google API 接收到的資訊將遵守{' '}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    Google API 服務使用者資料政策
                  </a>
                  ，包括其中的「有限使用」要求。我們不會將您的 Google Ads
                  數據用於訓練 AI/ML 模型。
                </p>
              </div>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  2. 我們收集的資料
                </h3>
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      2.1 帳戶資訊
                    </h4>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>電子郵件地址</li>
                      <li>姓名或顯示名稱</li>
                      <li>密碼（加密儲存）</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      2.2 廣告平台資料
                    </h4>
                    <p className="mt-2">
                      當您連接 Google Ads 或 Meta
                      廣告帳戶時，我們會存取以下資料：
                    </p>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>廣告帳戶基本資訊（帳戶 ID、名稱）</li>
                      <li>
                        廣告活動數據（曝光數、點擊數、轉換數、花費）
                      </li>
                      <li>素材資訊（廣告創意、圖片、文案）</li>
                      <li>受眾設定（目標對象、投放設定）</li>
                      <li>帳戶表現指標</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      2.3 使用數據
                    </h4>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>登入時間和頻率</li>
                      <li>功能使用紀錄</li>
                      <li>瀏覽器類型和裝置資訊</li>
                      <li>IP 位址（用於安全防護）</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  3. 資料使用方式
                </h3>
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                  <p>我們使用您的資料來：</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      <strong>提供服務：</strong>
                      分析您的廣告表現，提供優化建議
                    </li>
                    <li>
                      <strong>帳戶管理：</strong>驗證身份、管理訂閱
                    </li>
                    <li>
                      <strong>服務改進：</strong>
                      了解用戶需求，改善產品功能
                    </li>
                    <li>
                      <strong>安全防護：</strong>
                      偵測和防止詐欺或未授權存取
                    </li>
                    <li>
                      <strong>通知更新：</strong>
                      發送重要服務通知或產品更新（可選擇退出）
                    </li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  4. 資料儲存與安全
                </h3>
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                  <p>我們採取業界標準的安全措施來保護您的資料：</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>所有資料傳輸使用 TLS/SSL 加密</li>
                    <li>
                      敏感資料（如 OAuth tokens）使用 AES-256 加密儲存
                    </li>
                    <li>
                      資料庫存放於具有嚴格存取控制的雲端環境
                    </li>
                    <li>定期進行安全審計和漏洞掃描</li>
                  </ul>
                  <p className="mt-4">
                    <strong>資料保留期限：</strong>
                    我們會在您使用服務期間保留您的資料。如果您刪除帳戶，我們會在
                    30
                    天內刪除您的個人資料，除非法律要求保留更長時間。
                  </p>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  5. 第三方服務
                </h3>
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                  <p>本服務會與以下第三方平台整合：</p>
                  <div className="mt-4 space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Google Ads API
                      </h4>
                      <p className="mt-1 text-sm">
                        用於讀取和分析您的 Google 廣告數據。我們遵守{' '}
                        <a
                          href="https://developers.google.com/terms/api-services-user-data-policy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Google API 服務使用者資料政策
                        </a>
                        。
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Meta Marketing API
                      </h4>
                      <p className="mt-1 text-sm">
                        用於讀取和分析您的
                        Meta（Facebook/Instagram）廣告數據。我們遵守{' '}
                        <a
                          href="https://developers.facebook.com/terms/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Meta 平台條款
                        </a>
                        和{' '}
                        <a
                          href="https://developers.facebook.com/devpolicy/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          開發者政策
                        </a>
                        。
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  6. 資料分享、轉移與揭露
                </h3>
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                  <p>
                    <strong>
                      我們不會出售您的個人資料或 Google
                      用戶資料給任何第三方。
                    </strong>
                  </p>
                  <p>
                    我們僅在以下有限情況下分享資料：與雲端基礎設施提供商（Supabase、Vercel、Fly.io）合作以運行本服務，以及遵守適用法律、法規或法律程序的要求。
                  </p>
                  <p>我們不會進行的行為：</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>
                      出售或出租您的個人資料或 Google 用戶資料
                    </li>
                    <li>
                      將 Google 用戶資料用於向您投放廣告
                    </li>
                    <li>
                      將 Google
                      用戶資料分享給與提供或改進本服務無關的第三方
                    </li>
                    <li>
                      允許人工讀取 Google
                      用戶資料，除非取得您的明確同意、出於安全目的、遵守法律要求，或資料已匿名化處理
                    </li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  7. Cookie 使用
                </h3>
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                  <p>本服務使用 Cookie 和類似技術來：</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>維持您的登入狀態</li>
                    <li>記住您的偏好設定</li>
                    <li>分析服務使用情況</li>
                  </ul>
                  <p className="mt-4">
                    您可以透過瀏覽器設定管理 Cookie。但請注意，停用某些
                    Cookie 可能會影響服務的功能。
                  </p>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  8. 您的權利
                </h3>
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                  <p>
                    根據適用的隱私法規，您享有以下權利：
                  </p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      <strong>存取權：</strong>
                      要求查看我們持有的您的個人資料
                    </li>
                    <li>
                      <strong>更正權：</strong>
                      要求更正不準確的資料
                    </li>
                    <li>
                      <strong>刪除權：</strong>
                      要求刪除您的個人資料
                    </li>
                    <li>
                      <strong>資料可攜權：</strong>
                      要求以機器可讀格式匯出您的資料
                    </li>
                    <li>
                      <strong>撤回同意：</strong>
                      隨時撤回對資料處理的同意
                    </li>
                    <li>
                      <strong>斷開連接：</strong>
                      隨時解除與廣告平台的連接
                    </li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  9. 政策變更
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  我們可能會不時更新本隱私政策。如有重大變更，我們會透過電子郵件或服務內通知告知您。建議您定期查閱本政策以了解最新內容。
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  10. 聯絡我們
                </h3>
                <div className="text-gray-700 dark:text-gray-300">
                  <p>
                    如果您對本隱私政策有任何疑問或需要行使您的權利，請聯絡：
                  </p>
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p>
                      <strong>Entity:</strong> AdOptimize Operations Team
                    </p>
                    <p>
                      <strong>Email:</strong>{' '}
                      <a
                        href="mailto:privacy@adoptimize.com"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        privacy@adoptimize.com
                      </a>
                    </p>
                    <p>
                      <strong>Address:</strong> 7F., No. 123, Sec. 3, Nanjing
                      E. Rd., Zhongshan Dist., Taipei City 104, Taiwan
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-600 dark:text-gray-400 text-sm">
          <p>&copy; 2026 AdOptimize. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link href="/terms" className="hover:underline">
              Terms of Service / 服務條款
            </Link>
            <span>|</span>
            <Link href="/privacy" className="hover:underline">
              Privacy Policy / 隱私政策
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
