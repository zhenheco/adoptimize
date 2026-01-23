'use client';

import useSWR from 'swr';
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

const fetcher = async <T>(url: string) => {
  return api.get<T>(url);
};

export function useAutopilotSettings() {
  const { data, error, isLoading, mutate } = useSWR<AutopilotStatus>(
    '/autopilot/settings',
    fetcher
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

export function useAutopilotLogs(limit = 20) {
  const { data, error, isLoading, mutate } = useSWR<AutopilotLog[]>(
    `/autopilot/logs?limit=${limit}`,
    fetcher
  );

  return {
    logs: data || [],
    error,
    isLoading,
    mutate,
  };
}

export async function updateAutopilotSettings(settings: AutopilotSettings) {
  return api.put('/autopilot/settings', settings);
}

export async function toggleAutopilot() {
  return api.post('/autopilot/toggle');
}
