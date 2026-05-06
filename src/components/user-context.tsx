'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { ReactNode } from 'react';

export type Plan = 'free' | 'basic' | 'pro';

const VALID_PLANS: Plan[] = ['free', 'basic', 'pro'];

function safePlan(value: unknown): Plan {
  if (typeof value === 'string' && VALID_PLANS.includes(value as Plan)) {
    return value as Plan;
  }
  return 'free';
}

interface UserState {
  userId: string | null;
  plan: Plan;
  loading: boolean;
  countryCode: string | null;
  countryName: string | null;
}

const LOGGED_OUT: UserState = {
  userId: null,
  plan: 'free',
  loading: false,
  countryCode: null,
  countryName: null,
};

const UserContext = createContext<UserState>({
  ...LOGGED_OUT,
  loading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UserState>({ ...LOGGED_OUT, loading: true });

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setState(LOGGED_OUT);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan, country_code, country_name')
      .eq('id', user.id)
      .single();

    setState({
      userId: user.id,
      plan: safePlan(profile?.subscription_plan),
      loading: false,
      countryCode: profile?.country_code ?? null,
      countryName: profile?.country_name ?? null,
    });
  }, []);

  useEffect(() => {
    load();

    // Only re-fetch on actual sign-in / sign-out events, not on every token
    // refresh (which fires TOKEN_REFRESHED every ~60 min and causes needless DB calls).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        load();
      } else if (event === 'SIGNED_OUT') {
        setState(LOGGED_OUT);
      }
    });

    return () => subscription.unsubscribe();
  }, [load]);

  return <UserContext.Provider value={state}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
