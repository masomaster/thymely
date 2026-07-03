import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Badge, Button, Card, EmptyState, Screen } from '@/components/ui';
import { productTypeMeta } from '@/features/products/hooks';
import {
  useCompletions,
  useCompleteTask,
  useSkipTask,
  useSnoozeTask,
} from '@/features/today/hooks';
import { useDeleteTask, useSetTaskActive, useTask } from '@/features/tasks/hooks';
import { describeRule, daysOverdue } from '@/lib/recurrence';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: task, isLoading } = useTask(id);
  const { data: completions = [] } = useCompletions(id);
  const complete = useCompleteTask();
  const snooze = useSnoozeTask();
  const skip = useSkipTask();
  const setActive = useSetTaskActive();
  const remove = useDeleteTask();

  if (isLoading) {
    return (
      <Screen>
        <Text className="text-leaf-500">Loading…</Text>
      </Screen>
    );
  }

  if (!task) {
    return (
      <Screen>
        <EmptyState emoji="🔍" title="Task not found" />
      </Screen>
    );
  }

  const overdue = daysOverdue(task.next_due_date);
  const emoji = task.product ? productTypeMeta(task.product.type).emoji : '🌱';

  return (
    <Screen>
      <Card className="gap-2">
        <View className="flex-row items-center gap-3">
          <Text className="text-3xl">{emoji}</Text>
          <View className="flex-1">
            <Text className="text-xl font-bold text-leaf-900">{task.title}</Text>
            <Text className="text-sm text-leaf-600">
              {describeRule({
                frequency: task.frequency,
                interval: task.interval,
                repeatFrom: task.repeat_from,
              })}
            </Text>
          </View>
        </View>
        {task.product ? <Badge tone="soil" label={task.product.name} /> : null}
        {task.plants.length > 0 ? (
          <Text className="text-sm text-leaf-700">
            🪴 {task.plants.map((p) => p.name).join(', ')}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-2 mt-1">
          <Text className="text-sm text-leaf-500">Next due</Text>
          <Text className="text-sm font-semibold text-leaf-900">{task.next_due_date}</Text>
          {overdue > 0 ? <Badge tone="amber" label={`${overdue}d overdue`} /> : null}
          {!task.active ? <Badge tone="gray" label="Paused" /> : null}
        </View>
      </Card>

      <View className="flex-row flex-wrap gap-2">
        <Button
          title="✓ Done today"
          size="sm"
          onPress={() => complete.mutate({ task })}
          loading={complete.isPending}
        />
        <Button
          title="Snooze 1d"
          size="sm"
          variant="secondary"
          onPress={() => snooze.mutate({ task, days: 1 })}
        />
        <Button title="Skip" size="sm" variant="ghost" onPress={() => skip.mutate({ task })} />
        <Button
          title={task.active ? 'Pause' : 'Resume'}
          size="sm"
          variant="ghost"
          onPress={() => setActive.mutate({ id: task.id, active: !task.active })}
        />
      </View>

      <Text className="text-lg font-bold text-leaf-900 mt-2">History</Text>
      {completions.length === 0 ? (
        <Text className="text-leaf-500 text-sm">No completions logged yet.</Text>
      ) : (
        <View className="gap-2">
          {completions.map((c) => (
            <Card key={c.id} className="flex-row items-center gap-3 py-3">
              <Text className="text-xl">✅</Text>
              <View className="flex-1">
                <Text className="text-leaf-900 font-medium">{c.completed_on}</Text>
                {c.notes ? <Text className="text-sm text-leaf-600">{c.notes}</Text> : null}
              </View>
            </Card>
          ))}
        </View>
      )}

      <Button
        title="Delete task"
        variant="danger"
        onPress={() => remove.mutate(task.id, { onSuccess: () => router.replace('/') })}
      />
    </Screen>
  );
}
