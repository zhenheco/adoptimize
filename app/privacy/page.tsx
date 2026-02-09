import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '隱私政策 - AdOptimize',
  description: 'AdOptimize 隱私政策說明，包含資料收集、使用方式及用戶權利',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 頁首 */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            &larr; 返回首頁
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
            隱私政策
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            最後更新日期：2026 年 2 月 9 日
          </p>
        </div>
      </header>

      {/* 內容 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 space-y-8">
          {/* 簡介 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              1. 簡介
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              AdOptimize（以下簡稱「本服務」）是一個跨平台廣告優化工具，致力於幫助用戶管理和優化其
              Google Ads 和 Meta（Facebook/Instagram）廣告活動。我們非常重視您的隱私，本政策說明我們如何收集、使用、保護您的個人資料。
            </p>
          </section>

          {/* 資料收集 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              2. 我們收集的資料
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  2.1 帳戶資訊
                </h3>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>電子郵件地址</li>
                  <li>姓名或顯示名稱</li>
                  <li>密碼（加密儲存）</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  2.2 廣告平台資料
                </h3>
                <p className="mt-2">
                  當您連接 Google Ads 或 Meta 廣告帳戶時，我們會存取以下資料：
                </p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>廣告帳戶基本資訊（帳戶 ID、名稱）</li>
                  <li>廣告活動數據（曝光數、點擊數、轉換數、花費）</li>
                  <li>素材資訊（廣告創意、圖片、文案）</li>
                  <li>受眾設定（目標對象、投放設定）</li>
                  <li>帳戶表現指標</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  2.3 使用數據
                </h3>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>登入時間和頻率</li>
                  <li>功能使用紀錄</li>
                  <li>瀏覽器類型和裝置資訊</li>
                  <li>IP 位址（用於安全防護）</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 資料使用 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              3. 資料使用方式
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>我們使用您的資料來：</p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong>提供服務：</strong>分析您的廣告表現，提供優化建議
                </li>
                <li>
                  <strong>帳戶管理：</strong>驗證身份、管理訂閱
                </li>
                <li>
                  <strong>服務改進：</strong>了解用戶需求，改善產品功能
                </li>
                <li>
                  <strong>安全防護：</strong>偵測和防止詐欺或未授權存取
                </li>
                <li>
                  <strong>通知更新：</strong>發送重要服務通知或產品更新（可選擇退出）
                </li>
              </ul>
            </div>
          </section>

          {/* 資料儲存 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              4. 資料儲存與安全
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                我們採取業界標準的安全措施來保護您的資料：
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>所有資料傳輸使用 TLS/SSL 加密</li>
                <li>敏感資料（如 OAuth tokens）使用 AES-256 加密儲存</li>
                <li>資料庫存放於具有嚴格存取控制的雲端環境</li>
                <li>定期進行安全審計和漏洞掃描</li>
              </ul>
              <p className="mt-4">
                <strong>資料保留期限：</strong>我們會在您使用服務期間保留您的資料。如果您刪除帳戶，我們會在
                30 天內刪除您的個人資料，除非法律要求保留更長時間。
              </p>
            </div>
          </section>

          {/* 第三方服務 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              5. 第三方服務
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>本服務會與以下第三方平台整合：</p>
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Google Ads API
                  </h4>
                  <p className="mt-1 text-sm">
                    用於讀取和分析您的 Google 廣告數據。我們遵守
                    <a
                      href="https://developers.google.com/terms/api-services-user-data-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline ml-1"
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
                    用於讀取和分析您的 Meta（Facebook/Instagram）廣告數據。我們遵守
                    <a
                      href="https://developers.facebook.com/terms/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline ml-1"
                    >
                      Meta 平台條款
                    </a>
                    和
                    <a
                      href="https://developers.facebook.com/devpolicy/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline ml-1"
                    >
                      開發者政策
                    </a>
                    。
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 資料分享、轉移與揭露 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              6. 資料分享、轉移與揭露
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                <strong>我們不會出售您的個人資料或 Google 用戶資料給任何第三方。</strong>
              </p>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  6.1 我們可能分享資料的對象
                </h3>
                <p className="mt-2">
                  我們僅在以下有限情況下，與以下對象分享、轉移或揭露您的資料：
                </p>
                <ul className="mt-2 list-disc list-inside space-y-2">
                  <li>
                    <strong>雲端基礎設施提供商：</strong>我們使用
                    Supabase（資料庫託管）、Vercel（前端託管）和
                    Fly.io（後端託管）來運行本服務。這些提供商可能會在提供基礎設施服務的過程中處理您的資料，但不會將您的資料用於其自身目的。
                  </li>
                  <li>
                    <strong>廣告平台 API：</strong>當您授權連接 Google Ads
                    或 Meta 廣告帳戶時，我們會透過其官方 API
                    讀取您的廣告數據。我們不會將您的 Google
                    用戶資料傳送給這些平台，僅從這些平台讀取資料。
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  6.2 法律要求的揭露
                </h3>
                <p className="mt-2">
                  我們可能在以下情況下揭露您的資料：
                </p>
                <ul className="mt-2 list-disc list-inside space-y-2">
                  <li>遵守適用法律、法規或法律程序的要求</li>
                  <li>回應合法的政府請求（如法院命令或傳票）</li>
                  <li>保護 AdOptimize、我們的用戶或公眾的權利、財產或安全</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  6.3 業務轉讓
                </h3>
                <p className="mt-2">
                  如果 AdOptimize
                  涉及合併、收購或資產出售，您的資料可能會作為交易的一部分被轉移。在此情況下，我們會在資料轉移前通知您，並確保接收方遵守與本隱私政策同等的保護標準。
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  6.4 我們不會進行的行為
                </h3>
                <ul className="mt-2 list-disc list-inside space-y-2">
                  <li>我們不會出售或出租您的個人資料或 Google 用戶資料</li>
                  <li>
                    我們不會將 Google 用戶資料用於向您投放廣告
                  </li>
                  <li>
                    我們不會將 Google
                    用戶資料分享給與提供或改進本服務無關的第三方
                  </li>
                  <li>
                    我們不會允許人工讀取 Google
                    用戶資料，除非取得您的明確同意、出於安全目的、遵守法律要求，或資料已匿名化處理
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Cookie */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              7. Cookie 使用
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>本服務使用 Cookie 和類似技術來：</p>
              <ul className="list-disc list-inside space-y-2">
                <li>維持您的登入狀態</li>
                <li>記住您的偏好設定</li>
                <li>分析服務使用情況</li>
              </ul>
              <p className="mt-4">
                您可以透過瀏覽器設定管理 Cookie。但請注意，停用某些 Cookie
                可能會影響服務的功能。
              </p>
            </div>
          </section>

          {/* 用戶權利 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              8. 您的權利
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>根據適用的隱私法規，您享有以下權利：</p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong>存取權：</strong>要求查看我們持有的您的個人資料
                </li>
                <li>
                  <strong>更正權：</strong>要求更正不準確的資料
                </li>
                <li>
                  <strong>刪除權：</strong>要求刪除您的個人資料
                </li>
                <li>
                  <strong>資料可攜權：</strong>要求以機器可讀格式匯出您的資料
                </li>
                <li>
                  <strong>撤回同意：</strong>隨時撤回對資料處理的同意
                </li>
                <li>
                  <strong>斷開連接：</strong>隨時解除與廣告平台的連接
                </li>
              </ul>
              <p className="mt-4">
                如需行使上述權利，請透過下方聯絡方式與我們聯繫。
              </p>
            </div>
          </section>

          {/* 政策變更 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              9. 政策變更
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              我們可能會不時更新本隱私政策。如有重大變更，我們會透過電子郵件或服務內通知告知您。建議您定期查閱本政策以了解最新內容。
            </p>
          </section>

          {/* 聯絡方式 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              10. 聯絡我們
            </h2>
            <div className="text-gray-700 dark:text-gray-300">
              <p>如果您對本隱私政策有任何疑問或需要行使您的權利，請聯絡：</p>
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p>
                  <strong>電子郵件：</strong>
                  <a
                    href="mailto:privacy@adoptimize.com"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    privacy@adoptimize.com
                  </a>
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* 頁尾 */}
      <footer className="border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-600 dark:text-gray-400 text-sm">
          <p>&copy; 2026 AdOptimize. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link href="/terms" className="hover:underline">
              服務條款
            </Link>
            <span>|</span>
            <Link href="/privacy" className="hover:underline">
              隱私政策
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
