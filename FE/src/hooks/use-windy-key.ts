import { useState, useEffect } from 'react';
import { configApi } from '@/integrations/api';

const WINDY_KEY_TIMEOUT_MS = 8000;

function getLocalWindyKey(): string | null {
  const localKey = import.meta.env.VITE_WINDY_API_KEY;
  return typeof localKey === 'string' && localKey.trim().length > 0 ? localKey.trim() : null;
}

export function useWindyKey() {
  const [key, setKey] = useState<string | null>(getLocalWindyKey());
  const [loading, setLoading] = useState(() => getLocalWindyKey() === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const localKey = getLocalWindyKey();
    if (localKey) {
      setKey(localKey);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchKey = async () => {
      setLoading(true);
      setError(null);

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          window.setTimeout(() => {
            reject(new Error('Timed out while fetching Windy key'));
          }, WINDY_KEY_TIMEOUT_MS);
        });

        const data = await Promise.race([configApi.windyKey(), timeoutPromise]);

        if (cancelled) return;

        const nextKey = data?.key ?? null;
        if (!nextKey) {
          throw new Error('Windy key is empty');
        }

        setKey(nextKey);
      } catch (err) {
        if (cancelled) return;
        setKey(null);
        setError(err instanceof Error ? err.message : 'Failed to fetch Windy key');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchKey();

    return () => {
      cancelled = true;
    };
  }, []);

  return { key, loading, error };
}
