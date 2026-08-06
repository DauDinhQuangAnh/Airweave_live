import { useMemo } from 'react';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { deriveRiskProfile, RiskProfile } from '@/lib/risk-profile';

/** Convenience hook: derive RiskProfile from user_preferences. */
export function useRiskProfile(): { risk: RiskProfile; loading: boolean } {
  const { prefs, loading } = useUserPreferences();
  const risk = useMemo(
    () =>
      deriveRiskProfile({
        sensitive_group: prefs.sensitive_group,
        medical_history: prefs.medical_history,
        health_tier: prefs.health_tier,
        high_exposure: prefs.high_exposure,
        not_sure: prefs.not_sure,
        custom_sensitivity_note: prefs.custom_sensitivity_note,
      }),
    [prefs.sensitive_group, prefs.medical_history, prefs.health_tier, prefs.high_exposure, prefs.not_sure, prefs.custom_sensitivity_note]
  );
  return { risk, loading };
}
