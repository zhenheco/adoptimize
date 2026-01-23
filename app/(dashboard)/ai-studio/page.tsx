'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Image, Copy, RefreshCw, Lock } from 'lucide-react';
import { useAICopywriting } from '@/hooks/use-ai-copywriting';

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

export default function AIStudioPage() {
  const [productDescription, setProductDescription] = useState('');
  const [generatedCopy, setGeneratedCopy] = useState<GeneratedCopy | null>(null);
  const [usageCount] = useState(5);
  const usageLimit = 20;

  const { generate, isLoading: isGenerating, error } = useAICopywriting();

  const handleGenerate = async () => {
    if (!productDescription.trim()) return;

    try {
      const result = await generate(productDescription);

      setGeneratedCopy({
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
        productName: productDescription.slice(0, 20),
        headlines: result.headlines,
        descriptions: result.descriptions,
      });
    } catch {
      // 錯誤已由 hook 處理
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: 顯示複製成功提示
  };

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ✨ AI 創作
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          讓 AI 幫你生成廣告文案和素材
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
                文案生成
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                讓 AI 幫你寫廣告標題和描述
              </p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              本月已用：{usageCount}/{usageLimit} 組
            </p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: `${(usageCount / usageLimit) * 100}%` }}
              />
            </div>
          </div>

          <textarea
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="描述你的商品或服務...&#10;例如：手工皂禮盒，天然植物萃取，適合送禮"
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
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                開始生成
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
                升級解鎖
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                素材包 +$1,990/月
              </p>
              <Button variant="outline" size="sm">
                了解更多
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Image className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                圖片生成
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                讓 AI 幫你做廣告圖片
              </p>
            </div>
          </div>

          <p className="text-gray-500 dark:text-gray-400">
            10 張/月
          </p>
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">
            生成失敗：{error.message}
          </p>
        </div>
      )}

      {/* 生成結果 */}
      {generatedCopy && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              生成結果
            </h2>
            <Button variant="outline" size="sm" onClick={handleGenerate}>
              <RefreshCw className="w-4 h-4 mr-1" />
              重新生成
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                標題
              </h3>
              {generatedCopy.headlines.map((headline, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2"
                >
                  <span className="text-gray-900 dark:text-white">{headline}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(headline)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                描述
              </h3>
              {generatedCopy.descriptions.map((desc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2"
                >
                  <span className="text-gray-900 dark:text-white text-sm">
                    {desc}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(desc)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 歷史記錄 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📋 最近生成的內容
        </h2>

        {mockHistory.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            尚無生成記錄
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
                  標題：{item.headlines[0]}
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
