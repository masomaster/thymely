import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { queryKeys } from '@/lib/queryClient';
import { getOwnerId, supabase } from '@/lib/supabase';
import type { Plant, PlantCatalogRow } from '@/lib/types';

/** Debounce any fast-changing value (used by the type-ahead combobox). */
export function useDebounced<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Fuzzy search the global plant catalog. Prefers the `search_plant_catalog`
 * Postgres RPC (trigram-ranked); falls back to a plain ILIKE query if the RPC
 * is not present yet.
 */
export function useCatalogSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.catalogSearch(trimmed.toLowerCase()),
    enabled: trimmed.length >= 2,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<PlantCatalogRow[]> => {
      const { data, error } = await supabase.rpc('search_plant_catalog', {
        query: trimmed,
        max_results: 20,
      });
      if (!error && data) return data as PlantCatalogRow[];

      // Fallback: direct ILIKE search.
      const pattern = `%${trimmed}%`;
      const { data: rows, error: fallbackError } = await supabase
        .from('plant_catalog')
        .select('*')
        .or(`common_name.ilike.${pattern},scientific_name.ilike.${pattern}`)
        .limit(20);
      if (fallbackError) throw fallbackError;
      return rows ?? [];
    },
  });
}

export function usePlants() {
  return useQuery({
    queryKey: queryKeys.plants,
    queryFn: async (): Promise<Plant[]> => {
      const ownerId = await getOwnerId();
      const { data, error } = await supabase
        .from('plants')
        .select('*')
        .eq('owner_id', ownerId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * The behind-the-scenes get-or-create used by the task wizard. Picking a catalog
 * plant (or typing a custom name) resolves to a row in the user's `plants` table
 * without them ever manually building a garden.
 */
export async function getOrCreatePlant(input: {
  catalogId: string | null;
  name: string;
}): Promise<Plant> {
  const ownerId = await getOwnerId();
  const name = input.name.trim();

  // Try to reuse an existing instance: match on catalog_id when present,
  // otherwise on the (case-insensitive) custom name.
  let existingQuery = supabase.from('plants').select('*').eq('owner_id', ownerId).limit(1);
  existingQuery = input.catalogId
    ? existingQuery.eq('catalog_id', input.catalogId)
    : existingQuery.is('catalog_id', null).ilike('name', name);

  const { data: existing, error: findError } = await existingQuery;
  if (findError) throw findError;
  if (existing && existing.length > 0) return existing[0];

  const { data, error } = await supabase
    .from('plants')
    .insert({
      owner_id: ownerId,
      catalog_id: input.catalogId,
      name,
      location: null,
      notes: null,
      photo_url: null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export function useUpdatePlant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<Plant> & { id: string }): Promise<Plant> => {
      const { data, error } = await supabase
        .from('plants')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.plants }),
  });
}

export function useDeletePlant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plants').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.plants });
      qc.invalidateQueries({ queryKey: queryKeys.tasks });
    },
  });
}
