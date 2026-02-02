'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Target,
  ImageIcon,
  CreditCard,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  reference_id?: string;
  reference_type?: string;
  created_at: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  showTitle?: boolean;
  limit?: number;
}

/**
 * 交易類型配置
 */
const TRANSACTION_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = {
  deposit: {
    label: '儲值',
    icon: <ArrowDownLeft className="w-4 h-4" />,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  subscription_fee: {
    label: '月費',
    icon: <CreditCard className="w-4 h-4" />,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  action_fee: {
    label: '操作抽成',
    icon: <Zap className="w-4 h-4" />,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  ai_audience: {
    label: 'AI 受眾分析',
    icon: <Target className="w-4 h-4" />,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  ai_copywriting: {
    label: 'AI 文案生成',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
  },
  ai_image: {
    label: 'AI 圖片生成',
    icon: <ImageIcon className="w-4 h-4" />,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
  refund: {
    label: '退款',
    icon: <RefreshCw className="w-4 h-4" />,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
  },
};

/**
 * 交易列表元件
 */
export function TransactionList({ transactions, showTitle = true, limit }: TransactionListProps) {
  const displayTransactions = limit ? transactions.slice(0, limit) : transactions;

  const formatAmount = (amount: number) => {
    const prefix = amount >= 0 ? '+' : '';
    return `${prefix}${new Intl.NumberFormat('zh-TW').format(amount)}`;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionConfig = (type: string) => {
    return TRANSACTION_CONFIG[type] || {
      label: type,
      icon: <ArrowUpRight className="w-4 h-4" />,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    };
  };

  if (displayTransactions.length === 0) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle className="text-lg">交易紀錄</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>尚無交易紀錄</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="text-lg">交易紀錄</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {displayTransactions.map((tx) => {
            const config = getTransactionConfig(tx.type);
            const isPositive = tx.amount >= 0;

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <span className={config.color}>{config.icon}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {config.label}
                      </span>
                      {tx.reference_type && (
                        <Badge variant="outline" className="text-xs">
                          {tx.reference_type}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {tx.description}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatDate(tx.created_at)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    isPositive
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {formatAmount(tx.amount)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    餘額 {new Intl.NumberFormat('zh-TW').format(tx.balance_after)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
