import Link from "next/link";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";
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
function PlatformBadge({
  name,
  color,
  comingSoon = false,
  comingSoonLabel,
}: {
  name: string;
  color: string;
  comingSoon?: boolean;
  comingSoonLabel?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide ${comingSoon ? "text-slate-500 bg-slate-500/10" : color}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${comingSoon ? "bg-slate-500 opacity-40" : "bg-current opacity-80"}`}
      />
      {name}
      {comingSoon && (
        <span className="text-[10px] font-normal opacity-60">{comingSoonLabel}</span>
      )}
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
  const t = useTranslations('landing');
  const tc = useTranslations('common');

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
            <span className="text-lg font-bold tracking-tight">{tc('brandName')}</span>
          </Link>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              {tc('login')}
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-400 text-slate-900 hover:bg-amber-300 transition-colors"
            >
              {tc('register')}
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
              comingSoon
              comingSoonLabel={tc('comingSoon')}
            />
            <PlatformBadge
              name="LinkedIn Ads"
              color="text-indigo-400 bg-indigo-400/10"
              comingSoon
              comingSoonLabel={tc('comingSoon')}
            />
            <PlatformBadge
              name="Reddit Ads"
              color="text-orange-400 bg-orange-400/10"
              comingSoon
              comingSoonLabel={tc('comingSoon')}
            />
            <PlatformBadge
              name="Pinterest Ads"
              color="text-red-400 bg-red-400/10"
              comingSoon
              comingSoonLabel={tc('comingSoon')}
            />
          </div>

          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.15] tracking-tight">
              <span className="text-slate-300">{t('heroTitle1')}</span>{" "}
              <span className="text-white">{t('heroTitle2')}</span>
              <span className="text-slate-300">,</span>
              <br />
              <span className="text-slate-300">{t('heroTitle3')}</span>{" "}
              <span className="text-white">{t('heroTitle4')}</span>
              <span className="text-slate-300">,</span>
              <br />
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                {t('heroTitle5')}
              </span>
            </h1>

            <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-xl">
              {t('heroDescription')}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 font-semibold hover:from-amber-300 hover:to-amber-400 transition-all duration-300 shadow-lg shadow-amber-400/20"
              >
                {t('ctaAI')}
                <Brain className="w-4 h-4" />
              </Link>
              <a
                href="#scenes"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/10 text-slate-300 font-medium hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300"
              >
                {t('ctaDemo')}
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* English Overview Section */}
      <section className="relative z-10 py-12 px-6 bg-white/[0.02] border-y border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                About AdOptimize
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                <strong>AdOptimize (廣告船長)</strong> is a comprehensive
                cross-platform advertising management tool designed to help
                businesses optimize their digital marketing performance. By
                integrating with <strong>Google Ads API</strong> and{" "}
                <strong>Meta Marketing API</strong>, we provide automated data
                analysis, consolidated reporting, and AI-driven recommendations.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1" />
                  <span className="text-xs text-slate-300">
                    Consolidated cross-platform dashboard
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1" />
                  <span className="text-xs text-slate-300">
                    AI-powered budget & bid optimization
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1" />
                  <span className="text-xs text-slate-300">
                    Automated performance summaries
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1" />
                  <span className="text-xs text-slate-300">
                    Privacy-first secure OAuth integration
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 max-w-sm">
              <p className="font-semibold mb-2">
                Google API Policy Compliance:
              </p>
              <p>
                AdOptimize strictly adheres to Google API Services User Data
                Policy. We only access necessary advertising performance data to
                provide optimization services and do not share user data with
                unauthorized third parties.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* === 故事場景區 === */}
      <div id="scenes">
        {/* Scene 1 - 早上 9 點：一眼看完所有平台 */}
        <SceneSection
          id="scene-1"
          timeLabel={t('scene1Time')}
          headline={t('scene1Title')}
          description={t('scene1Desc')}
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
                  {t('scene1WindowTitle')}
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
                        {tc('spend')}{" "}
                        <span className="text-white font-medium">
                          {row.spend}
                        </span>
                      </span>
                      <span>
                        {tc('conversions')}{" "}
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
                <span className="text-xs text-slate-500">{t('allPlatformTotal')}</span>
                <div className="flex items-center gap-6 text-xs">
                  <span className="text-amber-400 font-bold">NT$ 80,300</span>
                  <span className="text-white font-medium">2,233 {t('conversionsUnit')}</span>
                  <span className="text-emerald-400 font-bold">ROAS 4.2x</span>
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
          timeLabel={t('scene2Time')}
          headline={t('scene2Title')}
          description={t('scene2Desc')}
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
                  {t('aiAutopilotMode')}
                </span>
                <span className="ml-auto text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t('running')}
                </span>
              </div>

              <div className="space-y-2.5">
                <AiBubble
                  icon={PauseCircle}
                  message={t('aiBubble1Msg')}
                  detail={t('aiBubble1Detail')}
                  accent="bg-red-400/20 text-red-400"
                />
                <AiBubble
                  icon={PlayCircle}
                  message={t('aiBubble2Msg')}
                  detail={t('aiBubble2Detail')}
                  accent="bg-emerald-400/20 text-emerald-400"
                />
                <AiBubble
                  icon={Target}
                  message={t('aiBubble3Msg')}
                  detail={t('aiBubble3Detail')}
                  accent="bg-amber-400/20 text-amber-400"
                />
                <AiBubble
                  icon={TrendingUp}
                  message={t('aiBubble4Msg')}
                  detail={t('aiBubble4Detail')}
                  accent="bg-blue-400/20 text-blue-400"
                />
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-xs text-slate-500">{t('todayAI')}</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-white">{t('decisions', { count: 7 })}</span>
                  <span className="text-emerald-400 font-bold">
                    {t('saved', { amount: '2,100' })}
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
          timeLabel={t('scene3Time')}
          headline={t('scene3Title')}
          description={t('scene3Desc')}
        >
          {/* 報告模擬 */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-blue-400/10 via-amber-500/5 to-transparent rounded-3xl blur-2xl" />
            <div className="relative rounded-2xl border border-white/[0.08] bg-[#0f1424] p-5 shadow-2xl">
              <div className="flex items-center gap-2 mb-5">
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-white">
                  {t('reportTitle')}
                </span>
                <span className="ml-auto px-2 py-0.5 rounded text-[10px] bg-emerald-400/10 text-emerald-400 font-medium">
                  {t('autoGenerated')}
                </span>
              </div>

              {/* 核心數據 */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  {
                    label: t('totalSpend'),
                    value: t('totalSpendValue'),
                    sub: t('vsLastMonth8Down'),
                    good: true,
                  },
                  {
                    label: t('totalRevenue'),
                    value: t('totalRevenueValue'),
                    sub: t('vsLastMonth15Up'),
                    good: true,
                  },
                  {
                    label: t('returnRate'),
                    value: t('returnRateValue'),
                    sub: t('vsLastMonth06Up'),
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
                      {t('aiSummaryText')}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1.5">
                      {t('aiAutoSummary')}
                    </p>
                  </div>
                </div>
              </div>

              {/* 平台細分 */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { name: "Google Ads", roas: "4.5x" },
                  { name: "Meta Ads", roas: "3.8x" },
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
              {t('socialProof')}
            </p>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t('socialProofTitle')}
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-12">
            {t('socialProofDesc')}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "30%", label: t('stat1'), icon: TrendingUp },
              { value: "1.5x", label: t('stat2'), icon: BarChart3 },
              { value: "2 hrs", label: t('stat3'), icon: Clock },
              { value: "2+", label: t('stat4'), icon: Globe },
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
              {t('securityTitle')}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              {t('securityHeadline')}
            </h2>
            <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
              {t('securityDesc')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <Shield className="w-8 h-8 text-amber-400 mb-4" />
              <h3 className="text-xl font-bold mb-4">{t('oauthTitle')}</h3>
              <ul className="space-y-3">
                {[
                  t('oauth1'),
                  t('oauth2'),
                  t('oauth3'),
                  t('oauth4'),
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
              <h3 className="text-xl font-bold mb-4">{t('dataProtectionTitle')}</h3>
              <ul className="space-y-3">
                {[
                  t('dataProtection1'),
                  t('dataProtection2'),
                  t('dataProtection3'),
                  t('dataProtection4'),
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
                {t('googleDataDisclosure')}
              </strong>{" "}
              {t('googleDataDesc')}{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                {t('googleDataPolicy')}
              </a>
              {t('googleDataSuffix')}
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t('ctaTitle')}
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            {t('ctaDesc')}
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 font-bold text-lg hover:from-amber-300 hover:to-amber-400 transition-all duration-300 shadow-lg shadow-amber-400/25"
          >
            {t('ctaButton')}
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
                <span className="font-bold">{tc('brandName')}</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                {t('footerDesc')}
              </p>
            </div>

            {/* 產品 */}
            <div>
              <h4 className="font-semibold text-sm text-white mb-4">{t('footerProduct')}</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <Link
                    href="/dashboard"
                    className="hover:text-slate-300 transition-colors"
                  >
                    {t('footerDashboard')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/ai-studio"
                    className="hover:text-slate-300 transition-colors"
                  >
                    {t('footerAIStudio')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/reports"
                    className="hover:text-slate-300 transition-colors"
                  >
                    {t('footerReports')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="hover:text-slate-300 transition-colors"
                  >
                    {t('footerPricing')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* 法律與支援 */}
            <div>
              <h4 className="font-semibold text-sm text-white mb-4">
                {t('footerLegal')}
              </h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-slate-300 transition-colors"
                  >
                    {t('footerPrivacy')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-slate-300 transition-colors"
                  >
                    {t('footerTerms')}
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:support@adoptimize.com"
                    className="hover:text-slate-300 transition-colors"
                  >
                    {t('footerContact')}
                  </a>
                </li>
                <li className="pt-4 text-[10px] text-slate-600 leading-relaxed uppercase tracking-widest">
                  AdOptimize Operations Team
                  <br />
                  No. 13, Zhengyi Rd., Guanxi Township,
                  <br />
                  Hsinchu County 306, Taiwan
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <p>&copy; 2026 AdOptimize ({tc('brandName')}). All rights reserved.</p>
            <p>
              {t('footerCompliance')}{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-400 underline"
              >
                Google API Services User Data Policy
              </a>{" "}
              {t('footerAnd')}{" "}
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
