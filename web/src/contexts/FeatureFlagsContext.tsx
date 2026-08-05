import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { featureFlagsApi, type ResolvedFeatureFlag } from '../api/featureFlagsApi';
import { useAuth } from '../AuthContext';

const FLAG_REQUIRED_PLAN: Record<string, string> = {
  LUCIEN_AI: 'Growth',
  ADVANCED_REPORTS: 'Growth',
  CUSTOM_INTEGRATIONS: 'Enterprise',
};

interface FeatureFlagsContextValue {
  flags: ResolvedFeatureFlag[];
  loading: boolean;
  isEnabled: (flagKey: string) => boolean;
  requiredPlan: (flagKey: string) => string;
  reload: () => void;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: [],
  loading: true,
  isEnabled: () => false,
  requiredPlan: () => 'Growth',
  reload: () => {},
});

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [flags, setFlags] = useState<ResolvedFeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  const isPlatformAdmin = user?.roles?.some(r =>
    r.name === 'ROLE_PLATFORM_ADMIN' || r.name === 'PLATFORM_ADMIN'
  ) ?? false;

  const load = useCallback(async () => {
    if (!user || isPlatformAdmin) {
      setLoading(false);
      return;
    }
    try {
      const data = await featureFlagsApi.getForCurrentOrg();
      setFlags(data);
    } catch {
      setFlags([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isPlatformAdmin]);

  useEffect(() => { load(); }, [load]);

  const isEnabled = (flagKey: string): boolean => {
    if (isPlatformAdmin) return true;
    return flags.find(f => f.flagKey === flagKey)?.enabled ?? false;
  };

  const requiredPlan = (flagKey: string): string =>
    FLAG_REQUIRED_PLAN[flagKey] ?? 'Growth';

  return (
    <FeatureFlagsContext.Provider value={{ flags, loading, isEnabled, requiredPlan, reload: load }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlagsContext() {
  return useContext(FeatureFlagsContext);
}
