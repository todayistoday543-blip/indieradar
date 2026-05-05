'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ReactNode } from 'react';

export type Plan = 'free' | 'basic' | 'pro';

interface UserState {
  userId: string | null;
  plan: Plan;
  loading: boolean;
  countryCode: string | null;
  countryName: string | null;
}

const UserContext = createContext<UserState>({
  userId: null,
  plan: 'free',
  loading: true,
  countryCode: null,
  countryName: null,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UserState>({
    userId: null,
    plan: 'free',
    loading: true,
    countryCode: null,
    countryName: null,
  });

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setState({ userId: null, plan: 'free', loading: false, countryCode: null, countryName: null });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan, country_code, country_name')
        .eq('id', user.id)
        .single();

      const plan = (profile?.subscription_plan as Plan) || 'free';

      setState({
        userId: user.id,
        plan,
        loading: false,
        countryCode: profile?.country_code || null,
        countryName: profile?.country_name || null,
      });
    }

    load();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setState({ userId: null, plan: 'free', loading: false, countryCode: null, countryName: null });
      } else {
        // Re-fetch profile on auth change
        load();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <UserContext.Provider value={state}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
