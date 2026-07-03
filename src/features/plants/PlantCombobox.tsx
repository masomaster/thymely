import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useCatalogSearch, useDebounced } from './hooks';

export interface SelectedPlant {
  catalogId: string | null;
  name: string;
}

interface PlantComboboxProps {
  selected: SelectedPlant[];
  onChange: (next: SelectedPlant[]) => void;
}

function keyOf(p: SelectedPlant) {
  return p.catalogId ?? `custom:${p.name.toLowerCase()}`;
}

export function PlantCombobox({ selected, onChange }: PlantComboboxProps) {
  const [text, setText] = useState('');
  const debounced = useDebounced(text, 250);
  const { data: results = [], isFetching } = useCatalogSearch(debounced);

  const selectedKeys = new Set(selected.map(keyOf));
  const trimmed = text.trim();

  function add(plant: SelectedPlant) {
    if (selectedKeys.has(keyOf(plant))) return;
    onChange([...selected, plant]);
    setText('');
  }

  function remove(plant: SelectedPlant) {
    onChange(selected.filter((p) => keyOf(p) !== keyOf(plant)));
  }

  const hasExactMatch = results.some(
    (r) => r.common_name.toLowerCase() === trimmed.toLowerCase(),
  );
  const showAddCustom = trimmed.length >= 2 && !hasExactMatch;

  return (
    <View className="gap-2">
      {selected.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {selected.map((p) => (
            <Pressable
              key={keyOf(p)}
              onPress={() => remove(p)}
              className="flex-row items-center gap-1.5 bg-leaf-100 rounded-full pl-3 pr-2 py-1.5"
            >
              <Text className="text-leaf-800 text-sm font-medium">{p.name}</Text>
              <Text className="text-leaf-500 text-base leading-none">×</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="border border-leaf-200 rounded-xl bg-white overflow-hidden">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Search plants (e.g. tomato, basil, rose)…"
          placeholderTextColor="#9ca3af"
          className="px-4 py-3 text-base text-leaf-900"
          autoCorrect={false}
        />

        {trimmed.length >= 2 ? (
          <View className="border-t border-leaf-100">
            {isFetching ? (
              <View className="px-4 py-3 flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#457827" />
                <Text className="text-leaf-500 text-sm">Searching…</Text>
              </View>
            ) : null}

            {results.map((r) => {
              const disabled = selectedKeys.has(r.id);
              return (
                <Pressable
                  key={r.id}
                  disabled={disabled}
                  onPress={() => add({ catalogId: r.id, name: r.common_name })}
                  className={[
                    'px-4 py-3 border-t border-leaf-50 active:bg-leaf-50',
                    disabled ? 'opacity-40' : '',
                  ].join(' ')}
                >
                  <Text className="text-leaf-900 text-base">{r.common_name}</Text>
                  {r.scientific_name ? (
                    <Text className="text-leaf-500 text-xs italic">{r.scientific_name}</Text>
                  ) : null}
                </Pressable>
              );
            })}

            {!isFetching && results.length === 0 ? (
              <Text className="px-4 py-3 text-leaf-500 text-sm">No catalog matches.</Text>
            ) : null}

            {showAddCustom ? (
              <Pressable
                onPress={() => add({ catalogId: null, name: trimmed })}
                className="px-4 py-3 border-t border-leaf-100 active:bg-leaf-50 flex-row items-center gap-2"
              >
                <Text className="text-leaf-600 text-base">＋ Add “{trimmed}” as custom plant</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
