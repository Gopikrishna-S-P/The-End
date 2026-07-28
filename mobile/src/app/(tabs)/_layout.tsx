import { Tabs } from 'expo-router';
import { Home, Briefcase, Bell, User } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { useNotificationsBadge } from '@/hooks/useNotificationsBadge';

export default function TabsLayout() {
  const { colors } = useTheme();
  const unreadCount = useNotificationsBadge();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.ink3,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="cases"
        options={{ title: 'My Cases', tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tabs>
  );
}
