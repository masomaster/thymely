import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { queryKeys } from '@/lib/queryClient';
import { addDays, nextDueDate, ruleOf, today as todayStr } from '@/lib/recurrence';
import { supabase } from '@/lib/supabase';
import type { Completion, Task } from '@/lib/types';

import { useTasks } from '../tasks/hooks';

/** Active tasks that are due on/before the reference date, soonest first. */
export function useTodayTasks(reference: string = todayStr()) {
  const query = useTasks(false);
  const data = useMemo(
    () => (query.data ?? []).filter((t) => t.next_due_date <= reference),
    [query.data, reference],
  );
  return { ...query, data };
}

export interface CompleteTaskInput {
  task: Task;
  /** Date the task was actually done (supports backdating "did it early/late"). */
  completedOn?: string;
  plantId?: string | null;
  notes?: string | null;
}

/**
 * Check off a task: write a completion row and advance the task's next due date
 * according to its recurrence rule. Optimistically bumps the task out of Today.
 */
export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ task, completedOn, plantId, notes }: CompleteTaskInput) => {
      const doneOn = completedOn ?? todayStr();
      const newDue = nextDueDate(ruleOf(task), task.next_due_date, doneOn);

      const { error: cErr } = await supabase.from('completions').insert({
        task_id: task.id,
        plant_id: plantId ?? null,
        completed_on: doneOn,
        notes: notes?.trim() || null,
      });
      if (cErr) throw cErr;

      const { error: uErr } = await supabase
        .from('tasks')
        .update({ next_due_date: newDue })
        .eq('id', task.id);
      if (uErr) throw uErr;
      return newDue;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks });
      qc.invalidateQueries({ queryKey: queryKeys.completions() });
    },
  });
}

/** Push a task's next due date out by N days without logging a completion. */
export function useSnoozeTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ task, days = 1 }: { task: Task; days?: number }) => {
      const base = task.next_due_date < todayStr() ? todayStr() : task.next_due_date;
      const newDue = addDays(base, days);
      const { error } = await supabase
        .from('tasks')
        .update({ next_due_date: newDue })
        .eq('id', task.id);
      if (error) throw error;
      return newDue;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tasks }),
  });
}

/** Skip this occurrence: advance to the next scheduled slot, no completion logged. */
export function useSkipTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ task }: { task: Task }) => {
      // Roll the schedule forward to the next future slot, ignoring the missed one.
      const newDue = nextDueDate(
        { ...ruleOf(task), repeatFrom: 'due_date' },
        task.next_due_date,
        todayStr(),
      );
      const { error } = await supabase
        .from('tasks')
        .update({ next_due_date: newDue })
        .eq('id', task.id);
      if (error) throw error;
      return newDue;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tasks }),
  });
}

/** Completion history for a task (most recent first). */
export function useCompletions(taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.completions(taskId),
    enabled: Boolean(taskId),
    queryFn: async (): Promise<Completion[]> => {
      const { data, error } = await supabase
        .from('completions')
        .select('*')
        .eq('task_id', taskId!)
        .order('completed_on', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** All completions for the calendar/history views (most recent first). */
export function useAllCompletions() {
  return useQuery({
    queryKey: queryKeys.completions(),
    queryFn: async (): Promise<Completion[]> => {
      const { data, error } = await supabase
        .from('completions')
        .select('*')
        .order('completed_on', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}
