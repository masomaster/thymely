import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Badge, Card, EmptyState, Screen } from '@/components/ui';
import { useSharedSchedule } from '@/features/sharing/hooks';
import { describeRule, type Frequency, type RepeatFrom } from '@/lib/recurrence';

export default function SharedScheduleScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { data: tasks = [], isLoading, isError } = useSharedSchedule(token);

  return (
    <Screen>
      <View className="gap-1">
        <Text className="text-2xl font-bold text-leaf-900">Shared schedule 🌿</Text>
        <Text className="text-sm text-leaf-600">Read-only view of upcoming plant care.</Text>
      </View>

      {isLoading ? (
        <Text className="text-leaf-500">Loading…</Text>
      ) : isError ? (
        <EmptyState
          emoji="🔒"
          title="This link isn't available"
          subtitle="The share may have expired or been revoked."
        />
      ) : tasks.length === 0 ? (
        <EmptyState emoji="🌵" title="Nothing scheduled" />
      ) : (
        <View className="gap-3">
          {tasks.map((t) => (
            <Card key={t.id} className="gap-1">
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold text-leaf-900">{t.title}</Text>
                <Badge tone="soil" label={`Due ${t.next_due_date}`} />
              </View>
              <Text className="text-sm text-leaf-600">
                {describeRule({
                  frequency: t.frequency as Frequency,
                  interval: t.interval,
                  repeatFrom: t.repeat_from as RepeatFrom,
                })}
              </Text>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
