import { Text, View } from 'react-native';

import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Shown until the app is connected to a Supabase project. Keeps the first-run
 * experience friendly instead of throwing network errors.
 */
export function ConfigBanner() {
  if (isSupabaseConfigured) return null;
  return (
    <View className="bg-amber-100 border border-amber-200 rounded-xl p-4 gap-1">
      <Text className="text-amber-900 font-semibold">Connect Supabase to save data</Text>
      <Text className="text-amber-800 text-sm">
        Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to a .env file, then
        restart. See the README for the one-time setup.
      </Text>
    </View>
  );
}
