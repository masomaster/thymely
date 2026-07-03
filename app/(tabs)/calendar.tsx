import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Badge, Card, ConfigBanner, Screen } from '@/components/ui';
import { useAllCompletions } from '@/features/today/hooks';
import { useTasks } from '@/features/tasks/hooks';
import { addInterval, compareDates, formatDate, today } from '@/lib/recurrence';
import type { Completion, TaskWithRelations } from '@/lib/types';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface DayInfo {
  date: string;
  due: TaskWithRelations[];
  done: Completion[];
}

function projectDueInRange(
  task: TaskWithRelations,
  startIso: string,
  endIso: string,
): string[] {
  const out: string[] = [];
  let d = task.next_due_date;
  let guard = 0;
  // Fast-forward to the visible window.
  while (compareDates(d, startIso) < 0 && guard < 400) {
    d = addInterval(d, task.frequency, task.interval);
    guard++;
  }
  while (compareDates(d, endIso) <= 0 && guard < 800) {
    out.push(d);
    d = addInterval(d, task.frequency, task.interval);
    guard++;
  }
  return out;
}

export default function CalendarScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [selected, setSelected] = useState<string>(today());

  const { data: tasks = [] } = useTasks(false);
  const { data: completions = [] } = useAllCompletions();

  const monthStart = formatDate(new Date(Date.UTC(year, month, 1)));
  const monthEnd = formatDate(new Date(Date.UTC(year, month + 1, 0)));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();

  const byDate = useMemo(() => {
    const map = new Map<string, DayInfo>();
    const ensure = (date: string) => {
      if (!map.has(date)) map.set(date, { date, due: [], done: [] });
      return map.get(date)!;
    };
    for (const task of tasks) {
      for (const date of projectDueInRange(task, monthStart, monthEnd)) {
        ensure(date).due.push(task);
      }
    }
    for (const c of completions) {
      if (compareDates(c.completed_on, monthStart) >= 0 && compareDates(c.completed_on, monthEnd) <= 0) {
        ensure(c.completed_on).done.push(c);
      }
    }
    return map;
  }, [tasks, completions, monthStart, monthEnd]);

  function shiftMonth(delta: number) {
    const m = month + delta;
    const y = year + Math.floor(m / 12);
    const nm = ((m % 12) + 12) % 12;
    setYear(y);
    setMonth(nm);
  }

  // Build calendar cells (leading blanks + days).
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedInfo = byDate.get(selected);
  const todayIso = today();
  const completionTaskTitle = (c: Completion) =>
    tasks.find((t) => t.id === c.task_id)?.title ?? 'Task';

  return (
    <Screen>
      <Text className="text-2xl font-bold text-leaf-900">Calendar</Text>
      <ConfigBanner />

      <Card className="gap-3">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => shiftMonth(-1)} className="px-3 py-1.5 rounded-lg active:bg-leaf-50">
            <Text className="text-leaf-700 text-lg">‹</Text>
          </Pressable>
          <Text className="text-base font-semibold text-leaf-900">
            {MONTHS[month]} {year}
          </Text>
          <Pressable onPress={() => shiftMonth(1)} className="px-3 py-1.5 rounded-lg active:bg-leaf-50">
            <Text className="text-leaf-700 text-lg">›</Text>
          </Pressable>
        </View>

        <View className="flex-row">
          {WEEKDAYS.map((d, i) => (
            <View key={i} className="flex-1 items-center py-1">
              <Text className="text-xs text-leaf-400 font-medium">{d}</Text>
            </View>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {cells.map((day, idx) => {
            if (day === null) {
              return <View key={`b${idx}`} style={{ width: `${100 / 7}%` }} className="p-1" />;
            }
            const iso = formatDate(new Date(Date.UTC(year, month, day)));
            const info = byDate.get(iso);
            const isSelected = iso === selected;
            const isToday = iso === todayIso;
            return (
              <View key={iso} style={{ width: `${100 / 7}%` }} className="p-1">
                <Pressable
                  onPress={() => setSelected(iso)}
                  className={[
                    'aspect-square rounded-lg items-center justify-center',
                    isSelected ? 'bg-leaf-600' : isToday ? 'bg-leaf-100' : 'bg-transparent',
                  ].join(' ')}
                >
                  <Text
                    className={[
                      'text-sm',
                      isSelected ? 'text-white font-bold' : 'text-leaf-900',
                    ].join(' ')}
                  >
                    {day}
                  </Text>
                  <View className="flex-row gap-0.5 mt-0.5 h-1.5">
                    {info && info.due.length > 0 ? (
                      <View className={['w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white' : 'bg-amber-400'].join(' ')} />
                    ) : null}
                    {info && info.done.length > 0 ? (
                      <View className={['w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white' : 'bg-leaf-500'].join(' ')} />
                    ) : null}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View className="flex-row gap-4 pt-1">
          <View className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <Text className="text-xs text-leaf-600">Due</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full bg-leaf-500" />
            <Text className="text-xs text-leaf-600">Completed</Text>
          </View>
        </View>
      </Card>

      <Text className="text-lg font-bold text-leaf-900">{selected}</Text>
      {!selectedInfo || (selectedInfo.due.length === 0 && selectedInfo.done.length === 0) ? (
        <Text className="text-leaf-500 text-sm">Nothing scheduled or logged.</Text>
      ) : (
        <View className="gap-2">
          {selectedInfo.due.map((t) => (
            <Card key={`due-${t.id}`} className="flex-row items-center gap-3 py-3">
              <Text className="text-lg">🗓️</Text>
              <Text className="flex-1 text-leaf-900">{t.title}</Text>
              <Badge tone="amber" label="Due" />
            </Card>
          ))}
          {selectedInfo.done.map((c) => (
            <Card key={`done-${c.id}`} className="flex-row items-center gap-3 py-3">
              <Text className="text-lg">✅</Text>
              <Text className="flex-1 text-leaf-900">{completionTaskTitle(c)}</Text>
              <Badge tone="leaf" label="Done" />
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
