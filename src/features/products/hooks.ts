import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { getOwnerId, supabase } from '@/lib/supabase';
import type { Product, ProductType } from '@/lib/types';

export const PRODUCT_TYPES: { value: ProductType; label: string; emoji: string }[] = [
  { value: 'fertilizer', label: 'Fertilizer', emoji: '🌾' },
  { value: 'insecticide', label: 'Insecticide', emoji: '🐛' },
  { value: 'fungicide', label: 'Fungicide', emoji: '🍄' },
  { value: 'herbicide', label: 'Herbicide', emoji: '🌿' },
  { value: 'amendment', label: 'Soil amendment', emoji: '🪱' },
  { value: 'action', label: 'Action', emoji: '💧' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

export function productTypeMeta(type: ProductType) {
  return PRODUCT_TYPES.find((t) => t.value === type) ?? PRODUCT_TYPES[PRODUCT_TYPES.length - 1];
}

export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products,
    queryFn: async (): Promise<Product[]> => {
      const ownerId = await getOwnerId();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface ProductInput {
  name: string;
  type: ProductType;
  notes?: string | null;
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProductInput): Promise<Product> => {
      const ownerId = await getOwnerId();
      const { data, error } = await supabase
        .from('products')
        .insert({
          owner_id: ownerId,
          name: input.name.trim(),
          type: input.type,
          notes: input.notes?.trim() || null,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.products }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ProductInput & { id: string }): Promise<Product> => {
      const { data, error } = await supabase
        .from('products')
        .update({ name: input.name.trim(), type: input.type, notes: input.notes?.trim() || null })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.products }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.products }),
  });
}
