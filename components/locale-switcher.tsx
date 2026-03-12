'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LOCALES = [
  { value: 'zh-TW', label: '中文' },
  { value: 'en', label: 'EN' },
] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const nextLocale = locale === 'zh-TW' ? 'en' : 'zh-TW';
  const nextLabel = LOCALES.find((l) => l.value === nextLocale)?.label ?? nextLocale;

  const handleSwitch = async () => {
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: nextLocale }),
    });

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSwitch}
      disabled={isPending}
      className="gap-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer"
      title={`Switch to ${nextLabel}`}
    >
      <Globe className="w-4 h-4" />
      <span className="text-sm font-medium">{nextLabel}</span>
    </Button>
  );
}
