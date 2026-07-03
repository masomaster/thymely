import { Text, View } from 'react-native';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function EmptyState({ emoji = '🌱', title, subtitle, children }: EmptyStateProps) {
  return (
    <View className="items-center justify-center gap-2 py-12 px-6">
      <Text className="text-5xl mb-1">{emoji}</Text>
      <Text className="text-lg font-semibold text-leaf-900 text-center">{title}</Text>
      {subtitle ? (
        <Text className="text-sm text-leaf-600 text-center max-w-xs">{subtitle}</Text>
      ) : null}
      {children ? <View className="mt-3 w-full items-center">{children}</View> : null}
    </View>
  );
}
