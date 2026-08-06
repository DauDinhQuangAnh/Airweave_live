import { useAuth } from './use-auth';
import { profilesApi } from '@/integrations/api';
import { useState, useEffect } from 'react';

const BETA_PREMIUM_ENABLED = import.meta.env.VITE_ENABLE_BETA_PREMIUM !== 'false';

export function usePremium() {
  const { user } = useAuth();
  const [tier, setTier] = useState<'free' | 'premium'>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    // In Beta mode, everyone is premium
    if (BETA_PREMIUM_ENABLED) {
      setTier('premium');
      setLoading(false);
      return;
    }

    profilesApi
      .me()
      .then((profile) => setTier((profile?.account_tier as 'free' | 'premium') || 'free'))
      .catch(() => setTier('free'))
      .finally(() => setLoading(false));
  }, [user]);

  const isPremium = tier === 'premium';

  return { tier, isPremium, loading, isBeta: BETA_PREMIUM_ENABLED };
}
