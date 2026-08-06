import { useEffect, useState, useCallback } from 'react';
import { ConsentKey, getConsent, setConsent, subscribeConsent } from '@/lib/privacy-consent';

export function useConsent(key: ConsentKey) {
  const [value, setValue] = useState<'granted' | 'denied' | 'unknown'>(() => getConsent(key));

  useEffect(() => {
    const unsub = subscribeConsent(() => setValue(getConsent(key)));
    return unsub;
  }, [key]);

  const grant = useCallback(() => setConsent(key, 'granted'), [key]);
  const deny = useCallback(() => setConsent(key, 'denied'), [key]);

  return { value, grant, deny, granted: value === 'granted', denied: value === 'denied' };
}
