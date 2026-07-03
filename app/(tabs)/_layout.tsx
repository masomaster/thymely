import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

function TabIcon({ emoji, color }: { emoji: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#457827',
        tabBarInactiveTintColor: '#9ca3af',
        headerStyle: { backgroundColor: '#f1f8ec' },
        headerTintColor: '#28401f',
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: '#e0efd3' },
        sceneStyle: { backgroundColor: '#f1f8ec' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <TabIcon emoji="☀️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <TabIcon emoji="🗓️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="plants"
        options={{
          title: 'Garden',
          tabBarIcon: ({ color }) => <TabIcon emoji="🪴" color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color }) => <TabIcon emoji="🧪" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} />,
        }}
      />
    </Tabs>
  );
}
