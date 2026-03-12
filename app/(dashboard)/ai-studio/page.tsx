'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Sparkles, Image, Copy, RefreshCw, Lock, Check } from 'lucide-react';
import { useAICopywriting, type Platform, type AllPlatformResult, type GoogleAdsResult, type MetaAdsResult } from '@/hooks/use-ai-copywriting';

// Style values (labels resolved inside component with i18n)
const STYLE_VALUES = ['professional', 'casual', 'urgent', 'friendly', 'luxury', 'playful'] as const;
const STYLE_EMOJIS: Record<string, string> = {
  professional: '💼',
  casual: '😊',
  urgent: '⚡',
  friendly: '🤝',
  luxury: '✨',
  playful: '🎉',
};

interface GeneratedCopy {
  id: string;
  date: string;
  productName: string;
  headlines: string[];
  descriptions: string[];
}

const mockHistory: GeneratedCopy[] = [
  {
    id: '1',
    date: '1/22',
    productName: '春季促銷',
    headlines: ['限時特惠！全館商品 8 折起', '春季大促銷，把握機會'],
    descriptions: [
      '把握機會，錯過再等一年。精選商品限時優惠中！',
      '春暖花開，好物特惠。立即選購享獨家折扣。',
    ],
  },
];

// 複製提示元件
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy}>
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </Button>
  );
}

// 文案項目元件
function CopyItem({ text, charLimit }: { text: string; charLimit?: number }) {
  const charCount = text.length;
  const isOverLimit = charLimit && charCount > charLimit;

  return (
    <div className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2 group">
      <div className="flex-1">
        <span className="text-gray-900 dark:text-white">{text}</span>
        {charLimit && (
          <span className={`text-xs ml-2 ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
            ({charCount}/{charLimit})
          </span>
        )}
      </div>
      <CopyButton text={text} />
    </div>
  );
}

// Google Ads 結果元件
function GoogleAdsResults({ result }: { result: GoogleAdsResult }) {
  const t = useTranslations('aiStudio');
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">G</span>
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white">Google Ads</h3>
        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">RSA</span>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('headlines', { count: result.headlines.length })}
          <span className="text-gray-400 ml-2">{t('headlinesLimit', { limit: 30 })}</span>
        </h4>
        {result.headlines.map((headline, i) => (
          <CopyItem key={i} text={headline} charLimit={30} />
        ))}
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('descriptions', { count: result.descriptions.length })}
          <span className="text-gray-400 ml-2">{t('descriptionsLimit', { limit: 90 })}</span>
        </h4>
        {result.descriptions.map((desc, i) => (
          <CopyItem key={i} text={desc} charLimit={90} />
        ))}
      </div>
    </div>
  );
}

// Meta Ads 結果元件
function MetaAdsResults({ result }: { result: MetaAdsResult }) {
  const t = useTranslations('aiStudio');
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-pink-500 rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">M</span>
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white">Meta Ads</h3>
        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">FB/IG</span>
      </div>

      {result.primary_texts && result.primary_texts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('primaryTexts', { count: result.primary_texts.length })}
            <span className="text-gray-400 ml-2">{t('primaryTextsLimit', { limit: 125 })}</span>
          </h4>
          {result.primary_texts.map((text, i) => (
            <CopyItem key={i} text={text} charLimit={125} />
          ))}
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('headlines', { count: result.headlines.length })}
          <span className="text-gray-400 ml-2">{t('headlinesLimit', { limit: 27 })}</span>
        </h4>
        {result.headlines.map((headline, i) => (
          <CopyItem key={i} text={headline} charLimit={27} />
        ))}
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('descriptions', { count: result.descriptions.length })}
          <span className="text-gray-400 ml-2">{t('descriptionsLimit', { limit: 30 })}</span>
        </h4>
        {result.descriptions.map((desc, i) => (
          <CopyItem key={i} text={desc} charLimit={30} />
        ))}
      </div>
    </div>
  );
}

export default function AIStudioPage() {
  const t = useTranslations('aiStudio');
  const tc = useTranslations('common');
  const [productDescription, setProductDescription] = useState('');
  const [platform, setPlatform] = useState<Platform>('all');
  const [style, setStyle] = useState('professional');
  const [generatedResult, setGeneratedResult] = useState<AllPlatformResult | GoogleAdsResult | MetaAdsResult | null>(null);
  const [usageCount] = useState(5);
  const usageLimit = 20;

  const { generate, isLoading: isGenerating, error } = useAICopywriting();

  const PLATFORMS: { value: Platform; label: string; description: string }[] = [
    { value: 'all', label: t('allPlatforms'), description: t('allPlatformsDesc') },
    { value: 'google', label: 'Google Ads', description: t('googleAdsDesc') },
    { value: 'meta', label: 'Meta Ads', description: t('metaAdsDesc') },
  ];

  const STYLES = STYLE_VALUES.map((value) => ({
    value,
    label: t(value),
    emoji: STYLE_EMOJIS[value],
  }));

  const handleGenerate = async () => {
    if (!productDescription.trim()) return;

    try {
      const result = await generate(productDescription, style, platform);
      setGeneratedResult(result);
    } catch {
      // 錯誤已由 hook 處理
    }
  };

  // 判斷結果類型
  const isAllPlatform = (r: unknown): r is AllPlatformResult => {
    return r !== null && typeof r === 'object' && 'google' in r && 'meta' in r;
  };

  const isMeta = (r: unknown): r is MetaAdsResult => {
    return r !== null && typeof r === 'object' && 'primary_texts' in r;
  };

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ✨ {t('title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* 功能卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 文案生成 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {t('copywriting')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('copywritingDesc')}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              {t('monthlyUsage', { used: usageCount, limit: usageLimit })}
            </p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: `${(usageCount / usageLimit) * 100}%` }}
              />
            </div>
          </div>

          {/* 平台選擇 */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              {t('targetPlatform')}
            </label>
            <div className="flex gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    platform === p.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {PLATFORMS.find((p) => p.value === platform)?.description}
            </p>
          </div>

          {/* 風格選擇 */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              {t('copyStyle')}
            </label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    style === s.value
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-2 border-purple-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder={t('inputPlaceholder')}
            className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none mb-4"
          />

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !productDescription.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {t('generating')}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {t('startGenerate')}
              </>
            )}
          </Button>
        </div>

        {/* 圖片生成（鎖定） */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-gray-900/5 dark:bg-gray-900/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {t('upgradeUnlock')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {t('imageAddon')}
              </p>
              <Button variant="outline" size="sm">
                {tc('learnMore')}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Image className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {t('imageGeneration')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('imageGenerationDesc')}
              </p>
            </div>
          </div>

          <p className="text-gray-500 dark:text-gray-400">
            {t('imagesPerMonth')}
          </p>
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">
            {t('generationFailed', { error: error.message })}
          </p>
        </div>
      )}

      {/* 生成結果 */}
      {generatedResult && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              🎯 {t('generatedResult')}
            </h2>
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
              {t('regenerate')}
            </Button>
          </div>

          {isAllPlatform(generatedResult) ? (
            <div className="space-y-8">
              <GoogleAdsResults result={generatedResult.google} />
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <MetaAdsResults result={generatedResult.meta} />
              </div>
            </div>
          ) : isMeta(generatedResult) ? (
            <MetaAdsResults result={generatedResult} />
          ) : (
            <GoogleAdsResults result={generatedResult as GoogleAdsResult} />
          )}
        </div>
      )}

      {/* 歷史記錄 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📋 {t('recentGenerated')}
        </h2>

        {mockHistory.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            {t('noHistory')}
          </p>
        ) : (
          <div className="space-y-4">
            {mockHistory.map((item) => (
              <div
                key={item.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {item.date} - {item.productName}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                  {t('headlineLabel', { text: item.headlines[0] })}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {item.descriptions[0].slice(0, 50)}...
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
