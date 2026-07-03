import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Central place for query keys so invalidation stays consistent. */
export const queryKeys = {
  tasks: ['tasks'] as const,
  today: ['tasks', 'today'] as const,
  plants: ['plants'] as const,
  products: ['products'] as const,
  completions: (taskId?: string) =>
    taskId ? (['completions', taskId] as const) : (['completions'] as const),
  catalogSearch: (q: string) => ['catalog', 'search', q] as const,
};
