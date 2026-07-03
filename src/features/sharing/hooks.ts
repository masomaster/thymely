import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { queryKeys } from '@/lib/queryClient';
import { getOwnerId, supabase } from '@/lib/supabase';
import type { Database, ShareRow } from '@/lib/types';

export type Share = ShareRow;
export type SharedTask =
  Database['public']['Functions']['get_shared_schedule']['Returns'][number];

/** Build the public URL a share token resolves to. */
export function shareUrl(token: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/share/${token}`;
  }
  return `thymely://share/${token}`;
}

export function useShares() {
  return useQuery({
    queryKey: queryKeys.shares,
    queryFn: async (): Promise<Share[]> => {
      const ownerId = await getOwnerId();
      const { data, error } = await supabase
        .from('shares')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      kind: 'read_only' | 'caretaker';
      expiresInDays?: number | null;
    }): Promise<Share> => {
      const ownerId = await getOwnerId();
      const expires_at = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString()
        : null;
      const { data, error } = await supabase
        .from('shares')
        .insert({ owner_id: ownerId, kind: input.kind, expires_at })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shares }),
  });
}

export function useRevokeShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shares').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shares }),
  });
}

/** Resolve a share token to its (read-only) schedule via a security-definer RPC. */
export function useSharedSchedule(token: string | undefined) {
  return useQuery({
    queryKey: queryKeys.share(token),
    enabled: Boolean(token),
    queryFn: async (): Promise<SharedTask[]> => {
      const { data, error } = await supabase.rpc('get_shared_schedule', {
        share_token: token!,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}
