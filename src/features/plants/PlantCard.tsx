import { useState } from 'react';
import { Text, View } from 'react-native';

import { Badge, Button, Card, TextField } from '@/components/ui';
import type { Plant } from '@/lib/types';

import { useDeletePlant, useUpdatePlant } from './hooks';

export function PlantCard({ plant }: { plant: Plant }) {
  const update = useUpdatePlant();
  const remove = useDeletePlant();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(plant.name);
  const [location, setLocation] = useState(plant.location ?? '');
  const [notes, setNotes] = useState(plant.notes ?? '');

  if (editing) {
    return (
      <Card className="gap-3">
        <TextField label="Name" value={name} onChangeText={setName} />
        <TextField
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Raised bed 2, kitchen window"
        />
        <TextField label="Notes" value={notes} onChangeText={setNotes} multiline />
        <View className="flex-row gap-2">
          <Button
            title="Save"
            size="sm"
            loading={update.isPending}
            onPress={() =>
              update.mutate(
                {
                  id: plant.id,
                  name: name.trim() || plant.name,
                  location: location.trim() || null,
                  notes: notes.trim() || null,
                },
                { onSuccess: () => setEditing(false) },
              )
            }
          />
          <Button title="Cancel" size="sm" variant="ghost" onPress={() => setEditing(false)} />
        </View>
      </Card>
    );
  }

  return (
    <Card className="flex-row items-center gap-3">
      <Text className="text-2xl">🪴</Text>
      <View className="flex-1 gap-1">
        <Text className="font-semibold text-leaf-900">{plant.name}</Text>
        {plant.location ? <Badge tone="soil" label={plant.location} /> : null}
        {plant.notes ? <Text className="text-sm text-leaf-600">{plant.notes}</Text> : null}
        {plant.catalog_id ? null : <Badge tone="gray" label="Custom" />}
      </View>
      <View className="gap-2">
        <Button title="Edit" size="sm" variant="secondary" onPress={() => setEditing(true)} />
        <Button title="Delete" size="sm" variant="ghost" onPress={() => remove.mutate(plant.id)} />
      </View>
    </Card>
  );
}
