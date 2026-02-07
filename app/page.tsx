import Link from 'next/link';
import {
  Ship,
  BarChart3,
  Zap,
  Shield,
  TrendingUp,
  Target,
  Brain,
  ArrowRight,
  CheckCircle2,
  Globe,
  Lock,
  ChevronRight,
} from 'lucide-react';

/**
 * 平台標誌元件 - 顯示支援的廣告平台
 */
function PlatformBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide ${color}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {name}
    </span>
  );
}

/**
 * 功能卡片元件
 */
function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-amber-400/20 transition-all duration-500">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center mb-4 group-hover:bg-amber-400/20 transition-colors duration-300">
          <Icon className="w-5 h-5 text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/**
 * 步驟元件
 */
function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-sm font-bold text-slate-900">
        {number}
      </div>
      <div>
        <h4 className="font-semibold text-white mb-1">{title}</h4>
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white overflow-hidden">
      {/* 背景裝飾 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-amber-500/[0.05] rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
      </div>

      {/* 導航列 */}
      <nav className="relative z-10 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Ship className="w-4.5 h-4.5 text-slate-900" />
            </div>
            <span className="text-lg font-bold tracking-tight">廣告船長</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              登入
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-400 text-slate-900 hover:bg-amber-300 transition-colors"
            >
              免費開始
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* 平台標籤 */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center md:justify-start">
            <PlatformBadge name="Google Ads" color="text-blue-400 bg-blue-400/10" />
            <PlatformBadge name="Meta Ads" color="text-sky-400 bg-sky-400/10" />
            <PlatformBadge name="TikTok Ads" color="text-pink-400 bg-pink-400/10" />
            <PlatformBadge name="LinkedIn Ads" color="text-indigo-400 bg-indigo-400/10" />
          </div>

          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight">
              <span className="text-white">一個平台，</span>
              <br />
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                掌控所有廣告投放
              </span>
            </h1>

            <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-xl">
              廣告船長整合 Google Ads、Meta、TikTok、LinkedIn 四大廣告平台，
              透過 AI 智慧分析，幫你找出高效素材、優化預算配置、
              即時監控跨平台廣告表現。
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 font-semibold hover:from-amber-300 hover:to-amber-400 transition-all duration-300 shadow-lg shadow-amber-400/20"
              >
                免費註冊開始使用
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/10 text-slate-300 font-medium hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300"
              >
                查看 Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 數據亮點 */}
      <section className="relative z-10 py-16 px-6 border-y border-white/[0.06]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '4+', label: '支援廣告平台' },
            { value: 'AI', label: '智慧優化引擎' },
            { value: '24/7', label: '自動監控投放' },
            { value: '即時', label: '跨平台數據同步' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-extrabold bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 應用程式說明 - Google 驗證需要的核心內容 */}
      <section className="relative z-10 py-24 px-6" id="about">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-semibold tracking-widest uppercase mb-3">
              我們的服務
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              廣告船長為你做什麼？
            </h2>
            <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
              從數據整合到 AI 優化，一站式解決跨平台廣告管理的所有痛點
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={Globe}
              title="跨平台數據整合"
              description="連接你的 Google Ads、Meta、TikTok、LinkedIn 廣告帳號，在單一儀表板查看所有平台的廣告表現，不再需要切換多個後台。"
            />
            <FeatureCard
              icon={BarChart3}
              title="即時報表分析"
              description="自動同步各平台的曝光數、點擊率、轉換率、花費等核心指標，產生跨平台比較報表，找出最佳投放策略。"
            />
            <FeatureCard
              icon={Brain}
              title="AI 智慧優化"
              description="透過機器學習分析歷史數據，自動識別高效廣告素材、提供預算配置建議、預警素材疲勞度，讓每一分廣告預算都花在刀口上。"
            />
            <FeatureCard
              icon={Target}
              title="受眾洞察分析"
              description="分析各平台受眾的重疊度，找出未開發的潛力客群，避免跨平台重複投放，降低獲客成本。"
            />
            <FeatureCard
              icon={Zap}
              title="自動化投放"
              description="設定你的投放規則，廣告船長自動執行：暫停低效廣告、調整出價、分配預算，全天候為你優化廣告投放。"
            />
            <FeatureCard
              icon={TrendingUp}
              title="成效追蹤"
              description="追蹤從曝光到轉換的完整漏斗，比較不同時段的成效趨勢，清楚掌握每個廣告活動的投資報酬率。"
            />
          </div>
        </div>
      </section>

      {/* 使用流程 */}
      <section className="relative z-10 py-24 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-amber-400 text-sm font-semibold tracking-widest uppercase mb-3">
                簡單上手
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                三步驟開始優化廣告
              </h2>
              <p className="text-slate-400 mb-10">
                不需要複雜的設定，只要連接你的廣告帳號，
                廣告船長就會自動開始分析和優化。
              </p>
              <div className="space-y-8">
                <Step
                  number="1"
                  title="連接廣告帳號"
                  description="透過 OAuth 安全授權連接你的 Google Ads、Meta、TikTok 或 LinkedIn 廣告帳號。我們只讀取廣告數據，不會修改你的廣告設定。"
                />
                <Step
                  number="2"
                  title="自動數據同步"
                  description="連接完成後，系統每 15 分鐘自動同步一次你的廣告數據，包含活動、受眾、素材及成效指標。"
                />
                <Step
                  number="3"
                  title="獲取 AI 優化建議"
                  description="基於你的真實廣告數據，AI 引擎會自動分析並提供個人化的優化建議，幫你提升廣告 ROAS。"
                />
              </div>
            </div>

            {/* 模擬儀表板 */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-amber-400/10 via-blue-500/5 to-transparent rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl border border-white/[0.08] bg-[#0f1424] p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="ml-3 text-xs text-slate-500">廣告船長 — 儀表板</span>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: '總花費', value: 'NT$ 128,450', change: '-12%', good: true },
                      { label: '總轉換', value: '3,847', change: '+23%', good: true },
                      { label: 'ROAS', value: '4.2x', change: '+0.8', good: true },
                    ].map((m) => (
                      <div key={m.label} className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">{m.label}</div>
                        <div className="text-lg font-bold text-white mt-1">{m.value}</div>
                        <div className={`text-xs mt-0.5 ${m.good ? 'text-emerald-400' : 'text-red-400'}`}>
                          {m.change}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="h-32 rounded-lg bg-gradient-to-t from-amber-400/5 to-transparent border border-white/[0.04] flex items-end justify-around px-4 pb-3 gap-1">
                    {[40, 55, 35, 70, 60, 80, 65, 90, 75, 85, 95, 88].map((h, i) => (
                      <div
                        key={i}
                        className="w-full rounded-t bg-gradient-to-t from-amber-400/40 to-amber-400/80"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {['Google Ads', 'Meta', 'TikTok', 'LinkedIn'].map((p) => (
                      <span
                        key={p}
                        className="px-2 py-1 rounded text-[10px] bg-white/[0.04] text-slate-400 border border-white/[0.06]"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 資料安全說明 - Google 驗證需要的安全說明 */}
      <section className="relative z-10 py-24 px-6" id="security">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-semibold tracking-widest uppercase mb-3">
              資料安全
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              你的數據，我們全力保護
            </h2>
            <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
              廣告船長嚴格遵守各平台的資料使用政策，採用業界最高安全標準保護你的數據
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <Shield className="w-8 h-8 text-amber-400 mb-4" />
              <h3 className="text-xl font-bold mb-4">OAuth 安全授權</h3>
              <ul className="space-y-3">
                {[
                  '透過 OAuth 2.0 協議連接廣告帳號，我們不會儲存你的平台密碼',
                  '你可以隨時在各平台的設定中撤銷授權',
                  '僅申請讀取廣告數據所需的最小權限',
                  '遵守 Google API 服務使用者資料政策及 Meta 開發者政策',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <Lock className="w-8 h-8 text-amber-400 mb-4" />
              <h3 className="text-xl font-bold mb-4">資料保護措施</h3>
              <ul className="space-y-3">
                {[
                  '所有資料傳輸皆使用 TLS/SSL 加密保護',
                  'OAuth Token 使用 AES-256 加密儲存',
                  '不會將你的資料出售或分享給第三方',
                  '刪除帳號後 30 天內完全清除所有資料',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 p-6 rounded-2xl bg-blue-500/[0.06] border border-blue-400/10 text-center">
            <p className="text-sm text-slate-400">
              <strong className="text-blue-400">Google Ads 使用者資料使用聲明：</strong>{' '}
              廣告船長使用 Google Ads API 讀取你的廣告帳號數據（活動、群組、廣告、受眾及成效指標），
              僅用於在本平台提供廣告分析與優化建議服務。我們嚴格遵守{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Google API 服務使用者資料政策
              </a>
              ，不會將你的數據用於 AI/ML 模型訓練。
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            準備好讓 AI 幫你優化廣告了嗎？
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            免費開始使用，不需要綁定信用卡
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 font-bold text-lg hover:from-amber-300 hover:to-amber-400 transition-all duration-300 shadow-lg shadow-amber-400/25"
          >
            免費註冊
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10">
            {/* 品牌 */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  <Ship className="w-3.5 h-3.5 text-slate-900" />
                </div>
                <span className="font-bold">廣告船長</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                跨平台 AI 廣告優化工具。整合 Google Ads、Meta、TikTok、LinkedIn，
                幫助廣告主提升投放效率與投資報酬率。
              </p>
            </div>

            {/* 產品 */}
            <div>
              <h4 className="font-semibold text-sm text-white mb-4">產品</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <Link href="/dashboard" className="hover:text-slate-300 transition-colors">
                    儀表板
                  </Link>
                </li>
                <li>
                  <Link href="/ai-studio" className="hover:text-slate-300 transition-colors">
                    AI 工作室
                  </Link>
                </li>
                <li>
                  <Link href="/reports" className="hover:text-slate-300 transition-colors">
                    報表分析
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-slate-300 transition-colors">
                    方案與價格
                  </Link>
                </li>
              </ul>
            </div>

            {/* 法律與支援 */}
            <div>
              <h4 className="font-semibold text-sm text-white mb-4">法律與支援</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <Link href="/privacy" className="hover:text-slate-300 transition-colors">
                    隱私政策
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-slate-300 transition-colors">
                    服務條款
                  </Link>
                </li>
                <li>
                  <a href="mailto:support@adoptimize.com" className="hover:text-slate-300 transition-colors">
                    聯絡我們
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <p>&copy; 2026 AdOptimize. All rights reserved.</p>
            <p>
              遵守{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-400 underline"
              >
                Google API Services User Data Policy
              </a>
              {' '}及{' '}
              <a
                href="https://developers.facebook.com/devpolicy/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-400 underline"
              >
                Meta Platform Terms
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
