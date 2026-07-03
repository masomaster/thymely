import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/lib/queryClient';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#f1f8ec' },
              headerTintColor: '#28401f',
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: '#f1f8ec' },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="tasks/new"
              options={{ title: 'New task', presentation: 'modal' }}
            />
            <Stack.Screen name="tasks/[id]" options={{ title: 'Task' }} />
            <Stack.Screen name="share/[token]" options={{ title: 'Shared schedule' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
