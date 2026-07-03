import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Badge, Button, Card, ConfigBanner, EmptyState, Screen, TextField } from '@/components/ui';
import {
  PRODUCT_TYPES,
  productTypeMeta,
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
} from '@/features/products/hooks';
import type { ProductType } from '@/lib/types';

export default function ProductsScreen() {
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<ProductType>('fertilizer');
  const [notes, setNotes] = useState('');

  function reset() {
    setEditingId(null);
    setName('');
    setType('fertilizer');
    setNotes('');
  }

  function submit() {
    if (!name.trim()) return;
    const payload = { name, type, notes };
    if (editingId) {
      updateProduct.mutate({ id: editingId, ...payload }, { onSuccess: reset });
    } else {
      createProduct.mutate(payload, { onSuccess: reset });
    }
  }

  const saving = createProduct.isPending || updateProduct.isPending;

  return (
    <Screen>
      <Text className="text-2xl font-bold text-leaf-900">Products & actions</Text>
      <Text className="text-sm text-leaf-600 -mt-2">
        The things you apply or do — fertilizers, sprays, or plain actions like watering.
      </Text>

      <ConfigBanner />

      <Card className="gap-3">
        <Text className="font-semibold text-leaf-900">
          {editingId ? 'Edit product' : 'Add a product'}
        </Text>
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Neem oil, Fish emulsion, Water"
        />
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-leaf-900">Type</Text>
          <View className="flex-row flex-wrap gap-2">
            {PRODUCT_TYPES.map((t) => {
              const active = t.value === type;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => setType(t.value)}
                  className={[
                    'flex-row items-center gap-1 px-3 py-2 rounded-full border',
                    active ? 'bg-leaf-600 border-leaf-600' : 'bg-white border-leaf-200',
                  ].join(' ')}
                >
                  <Text>{t.emoji}</Text>
                  <Text className={active ? 'text-white text-sm' : 'text-leaf-800 text-sm'}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <TextField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Dosage, mixing ratio, safety interval…"
          multiline
        />
        <View className="flex-row gap-2">
          <Button
            title={editingId ? 'Save changes' : 'Add product'}
            onPress={submit}
            loading={saving}
            disabled={!name.trim() || saving}
          />
          {editingId ? <Button title="Cancel" variant="ghost" onPress={reset} /> : null}
        </View>
      </Card>

      {isLoading ? (
        <Text className="text-leaf-500 px-1">Loading…</Text>
      ) : products.length === 0 ? (
        <EmptyState emoji="🧪" title="No products yet" subtitle="Add your first product above." />
      ) : (
        <View className="gap-3">
          {products.map((p) => {
            const meta = productTypeMeta(p.type);
            return (
              <Card key={p.id} className="flex-row items-center gap-3">
                <Text className="text-2xl">{meta.emoji}</Text>
                <View className="flex-1 gap-1">
                  <Text className="font-semibold text-leaf-900">{p.name}</Text>
                  <Badge tone="soil" label={meta.label} />
                  {p.notes ? <Text className="text-sm text-leaf-600">{p.notes}</Text> : null}
                </View>
                <View className="gap-2">
                  <Button
                    title="Edit"
                    size="sm"
                    variant="secondary"
                    onPress={() => {
                      setEditingId(p.id);
                      setName(p.name);
                      setType(p.type);
                      setNotes(p.notes ?? '');
                    }}
                  />
                  <Button
                    title="Delete"
                    size="sm"
                    variant="ghost"
                    onPress={() => deleteProduct.mutate(p.id)}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
