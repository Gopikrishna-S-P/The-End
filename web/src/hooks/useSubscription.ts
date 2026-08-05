import { useState, useEffect, useCallback } from 'react';
import { subscriptionApi, type SubscriptionInfo } from '../api/subscriptionApi';
import { useAuth } from '../AuthContext';

export function useSubscription() {
  const { user } = useAuth();
  const [sub, setSub]         = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const isPlatformAdmin = user?.roles?.some(r =>
    r.name === 'ROLE_PLATFORM_ADMIN' || r.name === 'PLATFORM_ADMIN'
  );

  const load = useCallback(async () => {
    if (!user || isPlatformAdmin) { setLoading(false); return; }
    try {
      const data = await subscriptionApi.get();
      setSub(data);
    } catch {
      setSub(null);
    } finally {
      setLoading(false);
    }
  }, [user, isPlatformAdmin]);

  useEffect(() => { load(); }, [load]);

  const isActive  = sub?.hasActiveSubscription ?? false;
  const isTrial   = sub?.status === 'TRIAL';
  const isExpired = !loading && !isPlatformAdmin && sub != null && !isActive;

  return { sub, loading, isActive, isTrial, isExpired, isPlatformAdmin, reload: load };
}
