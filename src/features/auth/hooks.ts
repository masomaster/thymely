import type { Session } from '@supabase/supabase-js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/** The URL Supabase should redirect back to after a magic-link / OAuth flow. */
function authRedirectTo(): string | undefined {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.origin : undefined;
  }
  return Linking.createURL('/');
}

/** Tracks the current Supabase auth session (null until Phase 2 auth is used). */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

/** Send a passwordless magic-link / OTP email. */
export function useSignInWithEmail() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: authRedirectTo() },
      });
      if (error) throw error;
    },
  });
}

/** Start an OAuth flow (Apple / Google). Requires providers enabled in Supabase. */
export function useSignInWithOAuth() {
  return useMutation({
    mutationFn: async (provider: 'apple' | 'google') => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: authRedirectTo(), skipBrowserRedirect: Platform.OS !== 'web' },
      });
      if (error) throw error;
      // On native, open the returned URL in a browser (expo-web-browser) to
      // complete the flow. Wired up further in Phase 2.
      if (Platform.OS !== 'web' && data?.url) {
        await Linking.openURL(data.url);
      }
    },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => qc.clear(),
  });
}
