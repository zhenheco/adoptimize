import Link from "next/link";
import {
  Ship,
  BarChart3,
  Shield,
  TrendingUp,
  Target,
  Brain,
  ArrowRight,
  CheckCircle2,
  Globe,
  Lock,
  ChevronRight,
  Clock,
  FileText,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  Users,
} from "lucide-react";

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
 * AI 聊天泡泡元件 - 模擬 AI 決策訊息
 */
function AiBubble({
  icon: Icon,
  message,
  detail,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
  detail: string;
  accent: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg ${accent} flex items-center justify-center`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-white">{message}</p>
        <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

/**
 * 場景區塊元件
 */
function SceneSection({
  id,
  timeLabel,
  headline,
  description,
  children,
  reverse = false,
}: {
  id?: string;
  timeLabel: string;
  headline: string;
  description: string;
  children: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <section className="relative z-10 py-20 px-6" id={id}>
      <div className="max-w-6xl mx-auto">
        <div
          className={`grid md:grid-cols-2 gap-12 lg:gap-16 items-center ${reverse ? "md:[direction:rtl]" : ""}`}
        >
          <div className={reverse ? "md:[direction:ltr]" : ""}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 text-xs font-semibold mb-4">
              <Clock className="w-3.5 h-3.5" />
              {timeLabel}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 leading-snug">
              {headline}
            </h2>
            <p className="text-slate-400 leading-relaxed">{description}</p>
          </div>
          <div className={reverse ? "md:[direction:ltr]" : ""}>{children}</div>
        </div>
      </div>
    </section>
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

      {/* Hero Section - 問題導向故事開場 */}
      <section className="relative z-10 pt-24 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* 平台標籤 */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center md:justify-start">
            <PlatformBadge
              name="Google Ads"
              color="text-blue-400 bg-blue-400/10"
            />
            <PlatformBadge name="Meta Ads" color="text-sky-400 bg-sky-400/10" />
            <PlatformBadge
              name="TikTok Ads"
              color="text-pink-400 bg-pink-400/10"
            />
            <PlatformBadge
              name="LinkedIn Ads"
              color="text-indigo-400 bg-indigo-400/10"
            />
            <PlatformBadge
              name="Reddit Ads"
              color="text-orange-400 bg-orange-400/10"
            />
            <PlatformBadge
              name="Pinterest Ads"
              color="text-red-400 bg-red-400/10"
            />
          </div>

          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.15] tracking-tight">
              <span className="text-slate-300">你是不是每天要切換</span>{" "}
              <span className="text-white">4 個廣告後台</span>
              <span className="text-slate-300">，</span>
              <br />
              <span className="text-slate-300">花</span>{" "}
              <span className="text-white">2 小時看報表</span>
              <span className="text-slate-300">，</span>
              <br />
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                卻還是不知道錢花得值不值？
              </span>
            </h1>

            <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-xl">
              廣告船長整合六大廣告平台，用 AI 幫你看數據、抓問題、省預算。
              你只需要每天花 5 分鐘，就能掌握全部廣告表現。
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 font-semibold hover:from-amber-300 hover:to-amber-400 transition-all duration-300 shadow-lg shadow-amber-400/20"
              >
                讓 AI 幫你看
                <Brain className="w-4 h-4" />
              </Link>
              <a
                href="#scenes"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/10 text-slate-300 font-medium hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300"
              >
                看看怎麼做到的
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* === 故事場景區 === */}
      <div id="scenes">
        {/* Scene 1 - 早上 9 點：一眼看完所有平台 */}
        <SceneSection
          id="scene-1"
          timeLabel="早上 9:00"
          headline="打開廣告船長，一眼看完所有平台"
          description="不用再輪流登入 Google、Meta、TikTok、LinkedIn 四個後台了。所有平台的花費、轉換、ROAS 全部整合在同一個畫面，30 秒就能掌握今天的狀況。"
        >
          {/* 模擬整合儀表板 */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-amber-400/10 via-blue-500/5 to-transparent rounded-3xl blur-2xl" />
            <div className="relative rounded-2xl border border-white/[0.08] bg-[#0f1424] p-5 shadow-2xl">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="ml-3 text-xs text-slate-500">
                  廣告船長 -- 跨平台總覽
                </span>
              </div>
              {/* 平台卡片 */}
              <div className="space-y-2.5">
                {[
                  {
                    platform: "Google Ads",
                    spend: "NT$ 42,100",
                    conv: "1,247",
                    roas: "4.5x",
                    color: "bg-blue-400",
                  },
                  {
                    platform: "Meta Ads",
                    spend: "NT$ 38,200",
                    conv: "986",
                    roas: "3.8x",
                    color: "bg-sky-400",
                  },
                  {
                    platform: "TikTok Ads",
                    spend: "NT$ 28,600",
                    conv: "1,024",
                    roas: "4.1x",
                    color: "bg-pink-400",
                  },
                  {
                    platform: "LinkedIn Ads",
                    spend: "NT$ 19,550",
                    conv: "590",
                    roas: "3.2x",
                    color: "bg-indigo-400",
                  },
                ].map((row) => (
                  <div
                    key={row.platform}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${row.color}`} />
                      <span className="text-sm font-medium text-white">
                        {row.platform}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-slate-400">
                      <span>
                        花費{" "}
                        <span className="text-white font-medium">
                          {row.spend}
                        </span>
                      </span>
                      <span>
                        轉換{" "}
                        <span className="text-white font-medium">
                          {row.conv}
                        </span>
                      </span>
                      <span>
                        ROAS{" "}
                        <span className="text-emerald-400 font-medium">
                          {row.roas}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {/* 小計 */}
              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-xs text-slate-500">全平台合計</span>
                <div className="flex items-center gap-6 text-xs">
                  <span className="text-amber-400 font-bold">NT$ 128,450</span>
                  <span className="text-white font-medium">3,847 轉換</span>
                  <span className="text-emerald-400 font-bold">ROAS 4.0x</span>
                </div>
              </div>
            </div>
          </div>
        </SceneSection>

        {/* 分隔線 */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </div>

        {/* Scene 2 - AI 自動優化 */}
        <SceneSection
          timeLabel="早上 10:30"
          headline="你喝咖啡的時候，AI 已經幫你省了 $2,100"
          description="廣告船長的 AI 引擎 24 小時不間斷地監控你的廣告。它會自動暫停燒錢的廣告、加碼表現好的素材，你不用盯著螢幕，預算就在自動優化中。"
          reverse
        >
          {/* AI 決策模擬 */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-emerald-400/10 via-amber-500/5 to-transparent rounded-3xl blur-2xl" />
            <div className="relative rounded-2xl border border-white/[0.08] bg-[#0f1424] p-5 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  <Brain className="w-3.5 h-3.5 text-slate-900" />
                </div>
                <span className="text-xs font-medium text-amber-400">
                  AI 自動駕駛模式
                </span>
                <span className="ml-auto text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  運作中
                </span>
              </div>

              <div className="space-y-2.5">
                <AiBubble
                  icon={PauseCircle}
                  message="已暫停 Meta 廣告「春季促銷 A」"
                  detail="CPA 上升 40%，超過門檻值。預計節省 NT$ 1,200/天"
                  accent="bg-red-400/20 text-red-400"
                />
                <AiBubble
                  icon={PlayCircle}
                  message="已加碼 Google 廣告「品牌字搜尋」"
                  detail="ROAS 達 6.2x，預算提升 20%。預計多賺 NT$ 3,400/天"
                  accent="bg-emerald-400/20 text-emerald-400"
                />
                <AiBubble
                  icon={Target}
                  message="偵測到 TikTok 素材疲勞"
                  detail="「開箱影片 v2」點擊率下降 25%，建議更換素材"
                  accent="bg-amber-400/20 text-amber-400"
                />
                <AiBubble
                  icon={TrendingUp}
                  message="已重新分配跨平台預算"
                  detail="將 LinkedIn 閒置預算 NT$ 900 轉移至表現更好的 Google Ads"
                  accent="bg-blue-400/20 text-blue-400"
                />
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-xs text-slate-500">今日 AI 操作</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-white">7 項決策</span>
                  <span className="text-emerald-400 font-bold">
                    節省 NT$ 2,100
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SceneSection>

        {/* 分隔線 */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </div>

        {/* Scene 3 - 月底報告 */}
        <SceneSection
          timeLabel="月底結算"
          headline="一鍵產出老闆看得懂的報告"
          description="不再用 Excel 拼拼湊湊。廣告船長自動彙整所有平台的數據，產出一份簡單清楚的成效摘要。老闆看得懂，你也不用加班做報表。"
        >
          {/* 報告模擬 */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-blue-400/10 via-amber-500/5 to-transparent rounded-3xl blur-2xl" />
            <div className="relative rounded-2xl border border-white/[0.08] bg-[#0f1424] p-5 shadow-2xl">
              <div className="flex items-center gap-2 mb-5">
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-white">
                  2 月份廣告成效摘要
                </span>
                <span className="ml-auto px-2 py-0.5 rounded text-[10px] bg-emerald-400/10 text-emerald-400 font-medium">
                  已自動產出
                </span>
              </div>

              {/* 核心數據 */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  {
                    label: "總花費",
                    value: "NT$ 12 萬",
                    sub: "較上月 -8%",
                    good: true,
                  },
                  {
                    label: "總營收",
                    value: "NT$ 45 萬",
                    sub: "較上月 +15%",
                    good: true,
                  },
                  {
                    label: "投報率",
                    value: "3.8 倍",
                    sub: "較上月 +0.6",
                    good: true,
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-center"
                  >
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {m.label}
                    </div>
                    <div className="text-lg font-bold text-white mt-1">
                      {m.value}
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${m.good ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {m.sub}
                    </div>
                  </div>
                ))}
              </div>

              {/* 一句話摘要 */}
              <div className="p-4 rounded-xl bg-amber-400/[0.06] border border-amber-400/10">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-white font-medium leading-relaxed">
                      「這個月花了 12 萬，賺回 45 萬，投報率 3.8 倍。 Google Ads
                      表現最佳，建議下月增加 15% 預算。」
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1.5">
                      -- AI 自動摘要
                    </p>
                  </div>
                </div>
              </div>

              {/* 平台細分 */}
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[
                  { name: "Google", roas: "4.5x" },
                  { name: "Meta", roas: "3.8x" },
                  { name: "TikTok", roas: "4.1x" },
                  { name: "LinkedIn", roas: "3.2x" },
                ].map((p) => (
                  <div
                    key={p.name}
                    className="text-center p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]"
                  >
                    <div className="text-[10px] text-slate-500">{p.name}</div>
                    <div className="text-sm font-bold text-white">{p.roas}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SceneSection>
      </div>

      {/* Social Proof */}
      <section className="relative z-10 py-20 px-6 border-y border-white/[0.06]">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Users className="w-5 h-5 text-amber-400" />
            <p className="text-amber-400 text-sm font-semibold tracking-widest uppercase">
              社群見證
            </p>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            加入 200+ 廣告主的行列
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-12">
            他們已經用廣告船長省下大量時間和廣告費
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "30%", label: "平均節省廣告成本", icon: TrendingUp },
              { value: "1.5x", label: "平均投報率提升", icon: BarChart3 },
              { value: "2 hrs", label: "每天省下的報表時間", icon: Clock },
              { value: "6+", label: "支援廣告平台", icon: Globe },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
              >
                <stat.icon className="w-6 h-6 text-amber-400 mx-auto mb-3" />
                <div className="text-3xl font-extrabold bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
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
                  "透過 OAuth 2.0 協議連接廣告帳號，我們不會儲存你的平台密碼",
                  "你可以隨時在各平台的設定中撤銷授權",
                  "僅申請讀取廣告數據所需的最小權限",
                  "遵守 Google API 服務使用者資料政策及 Meta 開發者政策",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-slate-400"
                  >
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
                  "所有資料傳輸皆使用 TLS/SSL 加密保護",
                  "OAuth Token 使用 AES-256 加密儲存",
                  "不會將你的資料出售或分享給第三方",
                  "刪除帳號後 30 天內完全清除所有資料",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-slate-400"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 p-6 rounded-2xl bg-blue-500/[0.06] border border-blue-400/10 text-center">
            <p className="text-sm text-slate-400">
              <strong className="text-blue-400">
                Google Ads 使用者資料使用聲明：
              </strong>{" "}
              廣告船長使用 Google Ads API
              讀取你的廣告帳號數據（活動、群組、廣告、受眾及成效指標），
              僅用於在本平台提供廣告分析與優化建議服務。我們嚴格遵守{" "}
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
                跨平台 AI 廣告優化工具。整合 Google
                Ads、Meta、TikTok、LinkedIn、Reddit、Pinterest 六大平台，
                幫助廣告主提升投放效率與投資報酬率。
              </p>
            </div>

            {/* 產品 */}
            <div>
              <h4 className="font-semibold text-sm text-white mb-4">產品</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <Link
                    href="/dashboard"
                    className="hover:text-slate-300 transition-colors"
                  >
                    儀表板
                  </Link>
                </li>
                <li>
                  <Link
                    href="/ai-studio"
                    className="hover:text-slate-300 transition-colors"
                  >
                    AI 工作室
                  </Link>
                </li>
                <li>
                  <Link
                    href="/reports"
                    className="hover:text-slate-300 transition-colors"
                  >
                    報表分析
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="hover:text-slate-300 transition-colors"
                  >
                    方案與價格
                  </Link>
                </li>
              </ul>
            </div>

            {/* 法律與支援 */}
            <div>
              <h4 className="font-semibold text-sm text-white mb-4">
                法律與支援
              </h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-slate-300 transition-colors"
                  >
                    隱私政策
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-slate-300 transition-colors"
                  >
                    服務條款
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:support@adoptimize.com"
                    className="hover:text-slate-300 transition-colors"
                  >
                    聯絡我們
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <p>&copy; 2026 AdOptimize. All rights reserved.</p>
            <p>
              遵守{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-400 underline"
              >
                Google API Services User Data Policy
              </a>{" "}
              及{" "}
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
