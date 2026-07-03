import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from './types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Whether the app has been wired up to a real Supabase project yet. When false,
 * the UI shows a friendly "connect Supabase" hint instead of crashing, so the
 * web export and first-run experience still work before credentials are set.
 */
export const isSupabaseConfigured =
  supabaseUrl.startsWith('http') && supabaseAnonKey.length > 0;

if (!isSupabaseConfigured && typeof console !== 'undefined') {
  console.warn(
    '[thymely] Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file (see .env.example).',
  );
}

/**
 * On native we persist the auth session with AsyncStorage. On web, supabase-js
 * defaults to localStorage which is exactly what we want, so we leave storage
 * undefined there.
 */
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Only relevant on web for magic-link redirects.
      detectSessionInUrl: Platform.OS === 'web',
    },
  },
);

/**
 * Phase 1 runs without authentication using a single implicit profile. Every
 * owner-scoped row is written with this fixed UUID, which the first migration
 * seeds into `profiles`. Phase 2 flips ownership to the authenticated user id
 * (see `getOwnerId`) and turns on strict RLS.
 */
export const IMPLICIT_OWNER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * The owner id to stamp on new rows / filter by. Returns the signed-in user's
 * id when a session exists, otherwise the Phase 1 implicit profile.
 */
export async function getOwnerId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? IMPLICIT_OWNER_ID;
}
