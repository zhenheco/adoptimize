import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service / 服務條款 - AdOptimize",
  description:
    "AdOptimize Terms of Service governing the use of our Google Ads and Meta Ads optimization platform.",
};

export default function TermsPage() {
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
            Terms of Service / 服務條款
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 underline decoration-amber-500 underline-offset-8">
                Terms of Service (English)
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                By accessing or using AdOptimize, you agree to be bound by these
                Terms of Service. If you do not agree to all of these terms, do
                not use our services.
              </p>
            </div>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Description of Service
              </h3>
              <div className="text-gray-700 dark:text-gray-300 space-y-2">
                <p>
                  AdOptimize is a cross-platform advertising optimization tool
                  that provides the following features:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    Integrate and analyze Google Ads and Meta advertising
                    account data
                  </li>
                  <li>
                    Provide AI-driven optimization suggestions and action plans
                  </li>
                  <li>
                    Monitor advertising performance and send anomaly
                    notifications
                  </li>
                  <li>Execute one-click optimization operations</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Account Registration and Use
              </h3>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    2.1 Eligibility
                  </h4>
                  <ul className="mt-2 list-disc list-inside space-y-1 ml-4">
                    <li>You must be at least 18 years old</li>
                    <li>
                      You must provide truthful and accurate registration
                      information
                    </li>
                    <li>Each person may register only one account</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    2.2 Account Security
                  </h4>
                  <ul className="mt-2 list-disc list-inside space-y-1 ml-4">
                    <li>
                      You are responsible for maintaining your account password
                      security
                    </li>
                    <li>
                      You must immediately notify us of any unauthorized use of
                      your account
                    </li>
                    <li>
                      You are responsible for all activities under your account
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    2.3 Advertising Platform Accounts
                  </h4>
                  <p className="mt-2">
                    When you connect a Google Ads or Meta advertising account,
                    you represent that you have the authority to grant our
                    service access to that account. You agree to comply with
                    Google&apos;s and Meta&apos;s terms of service.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                3. API Usage and Data
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Our service interacts with Google Ads and Meta Marketing
                platforms via their official APIs. By using AdOptimize, you
                grant us permission to access your advertising data through
                their respective APIs for the sole purpose of providing
                optimization services.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Subscription and Payment
              </h3>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <p>
                  The service offers different subscription tiers. Subscription
                  fees are charged monthly or annually based on your chosen
                  plan. All fees are prepaid and non-refundable unless otherwise
                  required by law.
                </p>
                <p>
                  Unless you cancel before your subscription expires,
                  subscriptions will automatically renew. You may manage your
                  subscription in your account settings at any time.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Disclaimer of Warranties
              </h3>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES
                  OF ANY KIND, EITHER EXPRESS OR IMPLIED.
                </p>
              </div>
              <ul className="mt-4 list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  We do not guarantee that optimization suggestions will produce
                  expected advertising results
                </li>
                <li>
                  We are not responsible for any changes in advertising
                  performance resulting from following our suggestions
                </li>
                <li>We do not guarantee uninterrupted or error-free service</li>
                <li>Your use of the service is at your own risk</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Limitation of Liability
              </h3>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <p>
                  To the maximum extent permitted by law, we shall not be liable
                  for any indirect, incidental, special, punitive, or
                  consequential damages, loss of profits, goodwill, or data.
                </p>
                <p>
                  In any event, our total liability to you shall not exceed the
                  total fees you paid to us in the 12 months preceding the
                  claim.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Termination
              </h3>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <p>
                  You may delete your account at any time through account
                  settings. Your data will be deleted within 30 days.
                </p>
                <p>
                  We reserve the right to suspend or terminate your account if
                  you violate these terms.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Changes to Terms
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                We reserve the right to modify these Terms of Service at any
                time. For significant changes, we will notify you via email or
                in-app notification. Your continued use of the service after
                changes take effect constitutes acceptance of the modified
                terms.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Governing Law
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                These Terms shall be governed by the laws of the Republic of
                China (Taiwan). Any disputes arising from these Terms shall be
                subject to the jurisdiction of the Taipei District Court as the
                court of first instance.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                10. Contact Information
              </h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                <p>
                  <strong>Entity:</strong> AdOptimize Operations Team
                </p>
                <p>
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:support@adoptimize.com"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    support@adoptimize.com
                  </a>
                </p>
                <p>
                  <strong>Address:</strong> No. 13, Zhengyi Rd., Guanxi
                  Township, Hsinchu County 306, Taiwan
                </p>
              </div>
            </section>
          </section>

          {/* ==================== Chinese Version ==================== */}
          <section id="chinese">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              服務條款 (中文版本)
            </h2>
            <div className="space-y-8">
              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  1. 服務說明
                </h3>
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

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  2. 帳戶註冊與使用
                </h3>
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      2.1 註冊資格
                    </h4>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>您必須年滿 18 歲或在您所在地區達到法定成年年齡</li>
                      <li>您必須提供真實、準確的註冊資訊</li>
                      <li>每人僅能註冊一個帳戶</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      2.2 帳戶安全
                    </h4>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>您有責任保護您的帳戶密碼安全</li>
                      <li>您應立即通知我們任何未授權使用您帳戶的情況</li>
                      <li>您對在您帳戶下發生的所有活動負責</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      2.3 廣告平台帳戶
                    </h4>
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

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  3. 服務使用規範
                </h3>
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                  <p>使用本服務時，您同意：</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>遵守所有適用的法律法規</li>
                    <li>不使用本服務進行任何非法或未授權的活動</li>
                    <li>不嘗試破解、干擾或破壞本服務的運作</li>
                    <li>
                      不使用自動化工具（如機器人、爬蟲）存取本服務，除非經過我們書面授權
                    </li>
                    <li>不轉售或轉讓您的帳戶存取權</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  4. 訂閱與付款
                </h3>
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                  <p>
                    本服務提供不同等級的訂閱方案。訂閱費用將根據您選擇的方案按月或按年收取。所有費用均需預付，不支援退款（除非法律另有規定）。
                  </p>
                  <p>
                    除非您在訂閱到期前取消，否則訂閱將自動續訂。您可以隨時在帳戶設定中管理訂閱。
                  </p>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  5. 免責聲明
                </h3>
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      本服務按「現狀」提供，不提供任何明示或暗示的保證。
                    </p>
                  </div>
                  <ul className="list-disc list-inside space-y-2">
                    <li>我們不保證本服務的優化建議必然帶來預期的廣告效果</li>
                    <li>我們不對因您採納建議而導致的任何廣告表現變化負責</li>
                    <li>我們不保證服務不會中斷或完全沒有錯誤</li>
                    <li>您使用本服務的風險由您自行承擔</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  6. 責任限制
                </h3>
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                  <p>
                    在法律允許的最大範圍內，我們對任何間接、附帶、特殊、懲罰性或後果性損害、利潤損失、商譽損失或數據損失不承擔責任。
                  </p>
                  <p>
                    在任何情況下，我們對您的總責任不超過您在索賠前 12
                    個月內向我們支付的費用總額。
                  </p>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  7. 服務終止
                </h3>
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                  <p>
                    您可以隨時透過帳戶設定刪除您的帳戶。刪除帳戶後，您的資料將在
                    30 天內被刪除。
                  </p>
                  <p>
                    如果您違反本條款，我們保留暫停或終止您帳戶的權利，恕不另行通知。
                  </p>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  8. 條款變更
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  我們保留隨時修改本服務條款的權利。如有重大變更，我們會透過電子郵件或服務內通知告知您。您在變更生效後繼續使用本服務，即表示您接受修改後的條款。
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  9. 準據法與管轄
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  本條款受中華民國法律管轄。因本條款引起或與之相關的任何爭議，雙方同意以臺灣臺北地方法院為第一審管轄法院。
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  10. 聯絡我們
                </h3>
                <div className="text-gray-700 dark:text-gray-300">
                  <p>如果您對本服務條款有任何疑問，請聯絡：</p>
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p>
                      <strong>Entity:</strong> AdOptimize Operations Team
                    </p>
                    <p>
                      <strong>Email:</strong>{" "}
                      <a
                        href="mailto:support@adoptimize.com"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        support@adoptimize.com
                      </a>
                    </p>
                    <p>
                      <strong>Address:</strong> No. 13, Zhengyi Rd., Guanxi
                      Township, Hsinchu County 306, Taiwan
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
