import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, ConfigBanner, EmptyState, Screen } from '@/components/ui';
import { usePlants } from '@/features/plants/hooks';
import { PlantCard } from '@/features/plants/PlantCard';

export default function GardenScreen() {
  const router = useRouter();
  const { data: plants = [], isLoading } = usePlants();

  return (
    <Screen>
      <Text className="text-2xl font-bold text-leaf-900">My garden</Text>
      <Text className="text-sm text-leaf-600 -mt-2">
        Plants are added automatically when you create tasks. Edit names, locations, and notes here.
      </Text>

      <ConfigBanner />

      {isLoading ? (
        <Text className="text-leaf-500 px-1">Loading…</Text>
      ) : plants.length === 0 ? (
        <EmptyState
          emoji="🌱"
          title="Your garden is empty"
          subtitle="Create a task and pick plants — they'll show up here automatically."
        >
          <Button title="Create a task" onPress={() => router.push('/tasks/new')} />
        </EmptyState>
      ) : (
        <View className="gap-3">
          {plants.map((p) => (
            <PlantCard key={p.id} plant={p} />
          ))}
        </View>
      )}
    </Screen>
  );
}
