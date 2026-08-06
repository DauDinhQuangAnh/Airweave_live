import { useEffect, useState, useCallback } from 'react';
import { preferencesApi } from '@/integrations/api';
import { useAuth } from '@/hooks/use-auth';

export interface UserPreferences {
  sensitive_group: string;
  alert_threshold: number;
  notify_enabled: boolean;
  alert_mode: string;
  quiet_hours_start: number;
  quiet_hours_end: number;
  route_priority: string;
  commute_type: string[];
  active_hours: string[];
  health_tier: string[];
  medical_history: string[];
  high_exposure: boolean;
  purifier_status: string;
  not_sure: boolean;
  custom_sensitivity_note: string;
}

const DEFAULTS: UserPreferences = {
  sensitive_group: 'none',
  alert_threshold: 100,
  notify_enabled: true,
  alert_mode: 'always',
  quiet_hours_start: 22,
  quiet_hours_end: 6,
  route_priority: 'balanced',
  commute_type: ['motorbike'],
  active_hours: ['morning_rush'],
  health_tier: ['self'],
  medical_history: [],
  high_exposure: false,
  purifier_status: 'not_interested',
  not_sure: false,
  custom_sensitivity_note: '',
};

export function useUserPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPrefs(DEFAULTS);
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      const data = await preferencesApi.get().catch(() => null);
      if (!active) return;
      if (data) {
        setPrefs({
          sensitive_group: data.sensitive_group ?? 'none',
          alert_threshold: data.alert_threshold ?? 100,
          notify_enabled: data.notify_enabled ?? true,
          alert_mode: data.alert_mode ?? 'always',
          quiet_hours_start: data.quiet_hours_start ?? 22,
          quiet_hours_end: data.quiet_hours_end ?? 6,
          route_priority: data.route_priority ?? 'balanced',
          commute_type: data.commute_type ?? ['motorbike'],
          active_hours: data.active_hours ?? ['morning_rush'],
          health_tier: data.health_tier ?? ['self'],
          medical_history: data.medical_history ?? [],
          high_exposure: data.high_exposure ?? false,
          purifier_status: data.purifier_status ?? 'not_interested',
          not_sure: (data as any).not_sure ?? false,
          custom_sensitivity_note: (data as any).custom_sensitivity_note ?? '',
        });
      } else {
        setPrefs(DEFAULTS);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  const update = useCallback(async (patch: Partial<UserPreferences>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    if (!user) return;
    await preferencesApi.upsert(patch);
  }, [user]);

  return { prefs, loading, update };
}
