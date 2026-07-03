import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { getOwnerId, supabase } from '@/lib/supabase';

export interface Share {
  id: string;
  owner_id: string;
  token: string;
  kind: 'read_only' | 'caretaker';
  expires_at: string | null;
  created_at: string;
}

export interface SharedTask {
  id: string;
  title: string;
  frequency: string;
  interval: number;
  repeat_from: string;
  next_due_date: string;
  active: boolean;
}

/** Build the public URL a share token resolves to. */
export function shareUrl(token: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/share/${token}`;
  }
  return `thymely://share/${token}`;
}

export function useShares() {
  return useQuery({
    queryKey: ['shares'],
    queryFn: async (): Promise<Share[]> => {
      const ownerId = await getOwnerId();
      const { data, error } = await supabase
        .from('shares')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Share[];
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
      return data as Share;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shares'] }),
  });
}

export function useRevokeShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shares').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shares'] }),
  });
}

/** Resolve a share token to its (read-only) schedule via a security-definer RPC. */
export function useSharedSchedule(token: string | undefined) {
  return useQuery({
    queryKey: ['share', token],
    enabled: Boolean(token),
    queryFn: async (): Promise<SharedTask[]> => {
      const { data, error } = await supabase.rpc('get_shared_schedule', {
        share_token: token!,
      });
      if (error) throw error;
      return (data ?? []) as SharedTask[];
    },
  });
}
