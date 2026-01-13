import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '服務條款 - AdOptimize',
  description: 'AdOptimize 服務條款，包含使用條件、責任限制及用戶義務',
};

export default function TermsPage() {
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
            服務條款
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            最後更新日期：2026 年 1 月 13 日
          </p>
        </div>
      </header>

      {/* 內容 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 space-y-8">
          {/* 簡介 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              1. 服務說明
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              <p>
                AdOptimize（以下簡稱「本服務」）是一個跨平台廣告優化工具，提供以下功能：
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>整合並分析 Google Ads 和 Meta 廣告帳戶數據</li>
                <li>提供廣告優化建議和行動方案</li>
                <li>監控廣告表現並發送異常通知</li>
                <li>執行一鍵優化操作</li>
              </ul>
              <p className="mt-4">
                使用本服務即表示您同意遵守本服務條款。如果您不同意這些條款，請勿使用本服務。
              </p>
            </div>
          </section>

          {/* 帳戶註冊 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              2. 帳戶註冊與使用
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  2.1 註冊資格
                </h3>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>您必須年滿 18 歲或在您所在地區達到法定成年年齡</li>
                  <li>您必須提供真實、準確的註冊資訊</li>
                  <li>每人僅能註冊一個帳戶</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  2.2 帳戶安全
                </h3>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>您有責任保護您的帳戶密碼安全</li>
                  <li>您應立即通知我們任何未授權使用您帳戶的情況</li>
                  <li>您對在您帳戶下發生的所有活動負責</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  2.3 廣告平台帳戶
                </h3>
                <p className="mt-2">
                  當您連接 Google Ads 或 Meta 廣告帳戶時：
                </p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>您聲明您有權限授權本服務存取該廣告帳戶</li>
                  <li>您同意遵守 Google 和 Meta 的服務條款</li>
                  <li>您了解我們將依據您的授權讀取和分析廣告數據</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 服務使用 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              3. 服務使用規範
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>使用本服務時，您同意：</p>
              <ul className="list-disc list-inside space-y-2">
                <li>遵守所有適用的法律法規</li>
                <li>不使用本服務進行任何非法或未授權的活動</li>
                <li>不嘗試破解、干擾或破壞本服務的運作</li>
                <li>不使用自動化工具（如機器人、爬蟲）存取本服務，除非經過我們書面授權</li>
                <li>不轉售或轉讓您的帳戶存取權</li>
              </ul>
            </div>
          </section>

          {/* 訂閱與付款 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              4. 訂閱與付款
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  4.1 訂閱方案
                </h3>
                <p className="mt-2">
                  本服務提供不同等級的訂閱方案，各方案的功能和限制詳見官網說明。
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  4.2 付款條款
                </h3>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>訂閱費用將根據您選擇的方案按月或按年收取</li>
                  <li>所有費用均需預付，不支援退款（除非法律另有規定）</li>
                  <li>我們保留調整價格的權利，但會提前通知您</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  4.3 自動續訂
                </h3>
                <p className="mt-2">
                  除非您在訂閱到期前取消，否則訂閱將自動續訂。您可以隨時在帳戶設定中管理訂閱。
                </p>
              </div>
            </div>
          </section>

          {/* 智慧財產權 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              5. 智慧財產權
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  5.1 本服務的權利
                </h3>
                <p className="mt-2">
                  本服務及其所有內容、功能和介面（包括但不限於軟體、程式碼、設計、文字、圖形）均為我們或我們的授權方所有，受著作權、商標和其他智慧財產權法保護。
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  5.2 您的內容
                </h3>
                <p className="mt-2">
                  您保留您提供給本服務的所有內容的所有權。透過使用本服務，您授予我們非獨家、全球性的許可，以運營和改進本服務所必需的方式處理您的內容。
                </p>
              </div>
            </div>
          </section>

          {/* 免責聲明 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              6. 免責聲明
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  本服務按「現狀」提供，不提供任何明示或暗示的保證。
                </p>
              </div>

              <ul className="list-disc list-inside space-y-2">
                <li>
                  我們不保證本服務的優化建議必然帶來預期的廣告效果
                </li>
                <li>
                  我們不對因您採納建議而導致的任何廣告表現變化負責
                </li>
                <li>
                  我們不保證服務不會中斷或完全沒有錯誤
                </li>
                <li>
                  您使用本服務的風險由您自行承擔
                </li>
              </ul>
            </div>
          </section>

          {/* 責任限制 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              7. 責任限制
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                在法律允許的最大範圍內，我們對以下情況不承擔責任：
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>任何間接、附帶、特殊、懲罰性或後果性損害</li>
                <li>利潤損失、商譽損失或數據損失</li>
                <li>因使用或無法使用本服務而產生的任何損害</li>
              </ul>
              <p className="mt-4">
                在任何情況下，我們對您的總責任不超過您在索賠前 12
                個月內向我們支付的費用總額。
              </p>
            </div>
          </section>

          {/* 服務終止 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              8. 服務終止
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  8.1 您的終止權利
                </h3>
                <p className="mt-2">
                  您可以隨時透過帳戶設定刪除您的帳戶。刪除帳戶後，您的資料將在 30 天內被刪除。
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  8.2 我們的終止權利
                </h3>
                <p className="mt-2">
                  如果您違反本條款，我們保留暫停或終止您帳戶的權利，恕不另行通知。
                </p>
              </div>
            </div>
          </section>

          {/* 條款變更 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              9. 條款變更
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              我們保留隨時修改本服務條款的權利。如有重大變更，我們會透過電子郵件或服務內通知告知您。您在變更生效後繼續使用本服務，即表示您接受修改後的條款。
            </p>
          </section>

          {/* 準據法 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              10. 準據法與管轄
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              本條款受中華民國法律管轄。因本條款引起或與之相關的任何爭議，雙方同意以臺灣臺北地方法院為第一審管轄法院。
            </p>
          </section>

          {/* 聯絡方式 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              11. 聯絡我們
            </h2>
            <div className="text-gray-700 dark:text-gray-300">
              <p>如果您對本服務條款有任何疑問，請聯絡：</p>
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p>
                  <strong>電子郵件：</strong>
                  <a
                    href="mailto:support@adoptimize.com"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    support@adoptimize.com
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
