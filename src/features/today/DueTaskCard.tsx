import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Badge, Button, Card, TextField } from '@/components/ui';
import { addDays, daysOverdue, describeRule, parseDate, ruleOf, today as todayStr } from '@/lib/recurrence';
import type { TaskWithRelations } from '@/lib/types';

import { productTypeMeta } from '../products/hooks';
import { useCompleteTask, useSkipTask, useSnoozeTask } from './hooks';

function isValidDate(value: string): boolean {
  try {
    parseDate(value);
    return true;
  } catch {
    return false;
  }
}

export function DueTaskCard({ task }: { task: TaskWithRelations }) {
  const router = useRouter();
  const complete = useCompleteTask();
  const snooze = useSnoozeTask();
  const skip = useSkipTask();

  const [showBackdate, setShowBackdate] = useState(false);
  const [dateValue, setDateValue] = useState(todayStr());

  const overdueDays = daysOverdue(task.next_due_date);
  const emoji = task.product ? productTypeMeta(task.product.type).emoji : '🌱';
  const busy = complete.isPending || snooze.isPending || skip.isPending;

  return (
    <Card className="gap-3">
      <View className="flex-row items-start gap-3">
        <Text className="text-2xl">{emoji}</Text>
        <View className="flex-1 gap-1">
          <Pressable onPress={() => router.push(`/tasks/${task.id}`)}>
            <Text className="text-base font-semibold text-leaf-900">{task.title}</Text>
          </Pressable>
          {task.plants.length > 0 ? (
            <Text className="text-sm text-leaf-600">
              {task.plants.map((p) => p.name).join(', ')}
            </Text>
          ) : null}
          <Text className="text-xs text-leaf-500">{describeRule(ruleOf(task))}</Text>
        </View>
        {overdueDays > 0 ? (
          <Badge tone="amber" label={`${overdueDays}d overdue`} />
        ) : (
          <Badge tone="leaf" label="Due today" />
        )}
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Button
          title="✓ Done"
          size="sm"
          onPress={() => complete.mutate({ task })}
          loading={complete.isPending}
          disabled={busy}
        />
        <Button
          title="Snooze 1d"
          size="sm"
          variant="secondary"
          onPress={() => snooze.mutate({ task, days: 1 })}
          disabled={busy}
        />
        <Button
          title="Skip"
          size="sm"
          variant="ghost"
          onPress={() => skip.mutate({ task })}
          disabled={busy}
        />
        <Button
          title={showBackdate ? 'Cancel' : 'Other day…'}
          size="sm"
          variant="ghost"
          onPress={() => setShowBackdate((v) => !v)}
          disabled={busy}
        />
      </View>

      {showBackdate ? (
        <View className="gap-2 bg-leaf-50 rounded-xl p-3">
          <TextField
            label="Completed on"
            value={dateValue}
            onChangeText={setDateValue}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            hint="Log that you did this early or late."
          />
          <View className="flex-row gap-2">
            <Button
              title="Yesterday"
              size="sm"
              variant="ghost"
              onPress={() => setDateValue(addDays(todayStr(), -1))}
            />
            <Button
              title="Log completion"
              size="sm"
              disabled={!isValidDate(dateValue) || busy}
              loading={complete.isPending}
              onPress={() =>
                complete.mutate(
                  { task, completedOn: dateValue },
                  { onSuccess: () => setShowBackdate(false) },
                )
              }
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
}
