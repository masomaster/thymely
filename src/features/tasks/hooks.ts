import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { initialDueDate, type Frequency, type RepeatFrom } from '@/lib/recurrence';
import { getOwnerId, supabase } from '@/lib/supabase';
import type { Plant, Product, Task, TaskWithRelations } from '@/lib/types';

import { getOrCreatePlant } from '../plants/hooks';

interface RawTaskRow extends Task {
  product: Product | null;
  task_plants: { plant: Plant | null }[] | null;
}

const TASK_SELECT = '*, product:products(*), task_plants(plant:plants(*))';

function mapTask(row: RawTaskRow): TaskWithRelations {
  return {
    ...row,
    product: row.product ?? null,
    plants: (row.task_plants ?? [])
      .map((tp) => tp.plant)
      .filter((p): p is Plant => Boolean(p)),
  };
}

export function useTasks(includeInactive = false) {
  return useQuery({
    queryKey: [...queryKeys.tasks, { includeInactive }],
    queryFn: async (): Promise<TaskWithRelations[]> => {
      const ownerId = await getOwnerId();
      let q = supabase
        .from('tasks')
        .select(TASK_SELECT)
        .eq('owner_id', ownerId)
        .order('next_due_date', { ascending: true });
      if (!includeInactive) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as unknown as RawTaskRow[]).map(mapTask);
    },
  });
}

export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.tasks, taskId],
    enabled: Boolean(taskId),
    queryFn: async (): Promise<TaskWithRelations | null> => {
      const { data, error } = await supabase
        .from('tasks')
        .select(TASK_SELECT)
        .eq('id', taskId!)
        .maybeSingle();
      if (error) throw error;
      return data ? mapTask(data as unknown as RawTaskRow) : null;
    },
  });
}

export interface CreateTaskInput {
  title: string;
  productId: string | null;
  frequency: Frequency;
  interval: number;
  repeatFrom: RepeatFrom;
  anchorDate: string;
  plants: { catalogId: string | null; name: string }[];
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput): Promise<Task> => {
      const ownerId = await getOwnerId();

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          owner_id: ownerId,
          title: input.title.trim(),
          product_id: input.productId,
          frequency: input.frequency,
          interval: input.interval,
          repeat_from: input.repeatFrom,
          anchor_date: input.anchorDate,
          next_due_date: initialDueDate(input.anchorDate),
          active: true,
        })
        .select('*')
        .single();
      if (error) throw error;

      // Resolve each selected plant to a garden row (get-or-create) and link it.
      const plantRows = await Promise.all(input.plants.map((p) => getOrCreatePlant(p)));
      if (plantRows.length > 0) {
        const links = plantRows.map((p) => ({ task_id: task.id, plant_id: p.id }));
        const { error: linkError } = await supabase.from('task_plants').insert(links);
        if (linkError) throw linkError;
      }
      return task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks });
      qc.invalidateQueries({ queryKey: queryKeys.plants });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Task> & { id: string }): Promise<Task> => {
      const { data, error } = await supabase
        .from('tasks')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tasks }),
  });
}

export function useSetTaskActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('tasks').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tasks }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tasks }),
  });
}
