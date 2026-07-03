import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Card, ConfigBanner, Screen, TextField } from '@/components/ui';
import { useProducts } from '@/features/products/hooks';
import { PlantCombobox, type SelectedPlant } from '@/features/plants/PlantCombobox';
import { useCreateTask } from '@/features/tasks/hooks';
import { describeRule, today, type Frequency, type RepeatFrom } from '@/lib/recurrence';

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const ACTION_PRESETS = ['Water', 'Fertilize', 'Prune', 'Spray', 'Weed', 'Harvest'];

const STEPS = ['What', 'How often', 'Which plants', 'Confirm'];

export default function NewTaskWizard() {
  const router = useRouter();
  const { data: products = [] } = useProducts();
  const createTask = useCreateTask();

  const [step, setStep] = useState(0);

  // Wizard state — held across steps, persisted only on confirm.
  const [title, setTitle] = useState('');
  const [productId, setProductId] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<Frequency>('week');
  const [interval, setIntervalValue] = useState('1');
  const [repeatFrom, setRepeatFrom] = useState<RepeatFrom>('completion');
  const [anchorDate, setAnchorDate] = useState(today());
  const [plants, setPlants] = useState<SelectedPlant[]>([]);

  const intervalNum = Math.max(1, Math.floor(Number(interval) || 1));
  const rule = { frequency, interval: intervalNum, repeatFrom };

  const canNext =
    (step === 0 && title.trim().length > 0) ||
    (step === 1 && intervalNum >= 1) ||
    step === 2 ||
    step === 3;

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }
  function back() {
    if (step > 0) setStep((s) => s - 1);
    else router.back();
  }

  function confirm() {
    createTask.mutate(
      {
        title,
        productId,
        frequency,
        interval: intervalNum,
        repeatFrom,
        anchorDate,
        plants: plants.map((p) => ({ catalogId: p.catalogId, name: p.name })),
      },
      {
        onSuccess: () => router.replace('/'),
      },
    );
  }

  return (
    <Screen>
      {/* Stepper */}
      <View className="flex-row items-center gap-2">
        {STEPS.map((label, i) => (
          <View key={label} className="flex-1 gap-1">
            <View
              className={[
                'h-1.5 rounded-full',
                i <= step ? 'bg-leaf-600' : 'bg-leaf-200',
              ].join(' ')}
            />
            <Text
              className={[
                'text-xs',
                i === step ? 'text-leaf-800 font-semibold' : 'text-leaf-400',
              ].join(' ')}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      <ConfigBanner />

      {step === 0 ? (
        <Card className="gap-4">
          <Text className="text-lg font-bold text-leaf-900">What needs to be done?</Text>
          <TextField
            label="Task title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Apply neem oil"
            autoFocus
          />
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-leaf-900">Quick actions</Text>
            <View className="flex-row flex-wrap gap-2">
              {ACTION_PRESETS.map((a) => (
                <Pressable
                  key={a}
                  onPress={() => setTitle(a)}
                  className="px-3 py-2 rounded-full border border-leaf-200 bg-white active:bg-leaf-50"
                >
                  <Text className="text-leaf-800 text-sm">{a}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-medium text-leaf-900">Product (optional)</Text>
            <View className="flex-row flex-wrap gap-2">
              <Pressable
                onPress={() => setProductId(null)}
                className={[
                  'px-3 py-2 rounded-full border',
                  productId === null ? 'bg-leaf-600 border-leaf-600' : 'bg-white border-leaf-200',
                ].join(' ')}
              >
                <Text className={productId === null ? 'text-white text-sm' : 'text-leaf-800 text-sm'}>
                  None
                </Text>
              </Pressable>
              {products.map((p) => {
                const active = productId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setProductId(p.id)}
                    className={[
                      'px-3 py-2 rounded-full border',
                      active ? 'bg-leaf-600 border-leaf-600' : 'bg-white border-leaf-200',
                    ].join(' ')}
                  >
                    <Text className={active ? 'text-white text-sm' : 'text-leaf-800 text-sm'}>
                      {p.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {products.length === 0 ? (
              <Text className="text-xs text-leaf-500">
                Add products in the Products tab to link them here.
              </Text>
            ) : null}
          </View>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card className="gap-4">
          <Text className="text-lg font-bold text-leaf-900">How often?</Text>

          <View className="flex-row items-center gap-3">
            <Text className="text-leaf-800">Every</Text>
            <TextField
              value={interval}
              onChangeText={setIntervalValue}
              keyboardType="number-pad"
              containerClassName="w-20"
              className="text-center"
            />
            <View className="flex-row gap-2">
              {FREQUENCIES.map((f) => {
                const active = frequency === f.value;
                return (
                  <Pressable
                    key={f.value}
                    onPress={() => setFrequency(f.value)}
                    className={[
                      'px-3 py-2 rounded-full border',
                      active ? 'bg-leaf-600 border-leaf-600' : 'bg-white border-leaf-200',
                    ].join(' ')}
                  >
                    <Text className={active ? 'text-white text-sm' : 'text-leaf-800 text-sm'}>
                      {intervalNum === 1 ? f.label : `${f.label}s`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-medium text-leaf-900">Repeat from</Text>
            {(
              [
                {
                  value: 'completion' as RepeatFrom,
                  title: 'When I complete it',
                  desc: 'Best for treatments — next date counts from the day you actually do it.',
                },
                {
                  value: 'due_date' as RepeatFrom,
                  title: 'The scheduled date',
                  desc: 'Best for calendar chores — stays on a fixed cadence.',
                },
              ]
            ).map((opt) => {
              const active = repeatFrom === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setRepeatFrom(opt.value)}
                  className={[
                    'p-3 rounded-xl border',
                    active ? 'border-leaf-600 bg-leaf-50' : 'border-leaf-200 bg-white',
                  ].join(' ')}
                >
                  <Text className="font-medium text-leaf-900">{opt.title}</Text>
                  <Text className="text-xs text-leaf-600">{opt.desc}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextField
            label="Start date"
            value={anchorDate}
            onChangeText={setAnchorDate}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            hint="The first day this task is due."
          />

          <Text className="text-sm text-leaf-600">📅 {describeRule(rule)}</Text>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="gap-3">
          <Text className="text-lg font-bold text-leaf-900">Which plants?</Text>
          <Text className="text-sm text-leaf-600">
            Search and select one or more. They're added to your garden automatically.
          </Text>
          <PlantCombobox selected={plants} onChange={setPlants} />
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="gap-3">
          <Text className="text-lg font-bold text-leaf-900">Confirm</Text>
          <Row label="Task" value={title || '—'} />
          <Row
            label="Product"
            value={products.find((p) => p.id === productId)?.name ?? 'None'}
          />
          <Row label="Schedule" value={describeRule(rule)} />
          <Row label="Starts" value={anchorDate} />
          <Row
            label="Plants"
            value={plants.length ? plants.map((p) => p.name).join(', ') : 'No specific plants'}
          />
        </Card>
      ) : null}

      <View className="flex-row gap-2">
        <Button title="Back" variant="ghost" onPress={back} disabled={createTask.isPending} />
        <View className="flex-1" />
        {step < STEPS.length - 1 ? (
          <Button title="Next" onPress={next} disabled={!canNext} />
        ) : (
          <Button
            title="Create task"
            onPress={confirm}
            loading={createTask.isPending}
            disabled={!title.trim()}
          />
        )}
      </View>

      {createTask.isError ? (
        <Text className="text-red-600 text-sm">
          Couldn't create the task. Check your Supabase connection.
        </Text>
      ) : null}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-3">
      <Text className="text-leaf-500 text-sm">{label}</Text>
      <Text className="text-leaf-900 text-sm font-medium flex-1 text-right">{value}</Text>
    </View>
  );
}
