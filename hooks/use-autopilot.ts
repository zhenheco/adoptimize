'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';

interface AutopilotSettings {
  target_cpa: number | null;
  monthly_budget: number | null;
  goal_type: string;
  auto_pause_enabled: boolean;
  auto_adjust_budget_enabled: boolean;
  auto_boost_enabled: boolean;
  notify_before_action: boolean;
}

interface AutopilotStatus {
  enabled: boolean;
  settings: AutopilotSettings;
  stats: {
    total_savings: number;
    actions_count: number;
    days_running: number;
  };
}

interface AutopilotLog {
  id: string;
  action_type: string;
  target_name: string | null;
  reason: string;
  estimated_savings: number | null;
  executed_at: string;
}

export function useAutopilotSettings() {
  const [data, setData] = useState<AutopilotStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await api.get<AutopilotStatus>('/autopilot/settings');
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('載入失敗'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    error,
    isLoading,
    mutate: fetchData,
  };
}

export function useAutopilotLogs(limit = 20) {
  const [logs, setLogs] = useState<AutopilotLog[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await api.get<AutopilotLog[]>(`/autopilot/logs?limit=${limit}`);
      setLogs(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('載入失敗'));
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    logs,
    error,
    isLoading,
    mutate: fetchData,
  };
}

export async function updateAutopilotSettings(settings: AutopilotSettings) {
  return api.put('/autopilot/settings', settings);
}

export async function toggleAutopilot() {
  return api.post('/autopilot/toggle');
}
