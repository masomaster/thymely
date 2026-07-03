import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, ConfigBanner, EmptyState, Screen } from '@/components/ui';
import { DueTaskCard } from '@/features/today/DueTaskCard';
import { useTodayTasks } from '@/features/today/hooks';
import { today } from '@/lib/recurrence';

function prettyToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function TodayScreen() {
  const router = useRouter();
  const { data: tasks = [], isLoading, isError, refetch } = useTodayTasks(today());

  return (
    <Screen>
      <View className="gap-1">
        <Text className="text-sm font-medium text-leaf-500">{prettyToday()}</Text>
        <Text className="text-3xl font-bold text-leaf-900">
          {tasks.length === 0 ? 'All caught up 🌿' : `${tasks.length} to tend`}
        </Text>
      </View>

      <ConfigBanner />

      <Button title="＋ New task" onPress={() => router.push('/tasks/new')} />

      {isLoading ? (
        <Text className="text-leaf-500 px-1">Loading your garden…</Text>
      ) : isError ? (
        <EmptyState
          emoji="🥀"
          title="Couldn't load tasks"
          subtitle="Check your Supabase connection and try again."
        >
          <Button title="Retry" variant="secondary" onPress={() => refetch()} />
        </EmptyState>
      ) : tasks.length === 0 ? (
        <EmptyState
          emoji="🌻"
          title="Nothing due today"
          subtitle="Your plants are happy. Create a task to schedule recurring care."
        >
          <Button title="Create your first task" onPress={() => router.push('/tasks/new')} />
        </EmptyState>
      ) : (
        <View className="gap-3">
          {tasks.map((task) => (
            <DueTaskCard key={task.id} task={task} />
          ))}
        </View>
      )}
    </Screen>
  );
}
