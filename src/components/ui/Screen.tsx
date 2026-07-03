import { ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps extends ViewProps {
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  /** Constrain content to a comfortable reading width and center it. */
  contentClassName?: string;
}

const MAX_WIDTH = 720;

export function Screen({
  scroll = true,
  children,
  contentClassName = '',
  ...props
}: ScreenProps) {
  const inner = (
    <View
      className={['w-full self-center px-4 py-4 gap-4', contentClassName].join(' ')}
      style={{ maxWidth: MAX_WIDTH }}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-leaf-50">
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          {...(props as object)}
        >
          {inner}
        </ScrollView>
      ) : (
        <View className="flex-1" {...props}>
          {inner}
        </View>
      )}
    </SafeAreaView>
  );
}
