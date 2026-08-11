import { Tabs } from 'expo-router';
import { Home, ShoppingBag, Briefcase, Bell, User, ClipboardCheck, IndianRupee, MoreHorizontal } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { useNotificationsBadge } from '@/hooks/useNotificationsBadge';
import { useAuth } from '@/context/AuthContext';

export default function TabsLayout() {
  const { colors } = useTheme();
  const unreadCount = useNotificationsBadge();
  const { role } = useAuth();

  // Role-aware tab setup.
  const isFieldRole = role === 'FO' || role === 'CALLER' || role === 'TRACER';
  const isLeadOrAdmin = role === 'MANAGER' || role === 'TL' || role === 'ORG_ADMIN';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.ink3,
        tabBarStyle: { 
          backgroundColor: colors.surface, 
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8
        },
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
      }}
    >
      {/* 1. Home / Dashboard */}
      <Tabs.Screen
        name="index"
        options={{ 
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => <Home color={color} fill={focused ? color : 'none'} size={size - 3} /> 
        }}
      />

      {/* 2. My Cases (FO/Tracer/Caller only) */}
      <Tabs.Screen
        name="cases"
        options={{ 
          title: 'My Cases', 
          tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size - 3} />,
          href: isFieldRole ? undefined : null // hide if not field role
        }}
      />

      {/* 2. Loans & Allocations (Leads/Admins only) — Note: loans is a stack/page built later, but routing is ready */}
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Loans',
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size - 3} />,
          href: isLeadOrAdmin ? undefined : null // hide if not lead/admin
        }}
      />

      {/* 3. Collections Hub */}
      <Tabs.Screen
        name="collections"
        options={{
          title: 'Collections',
          tabBarIcon: ({ color, size }) => <IndianRupee color={color} size={size - 3} />,
          href: undefined // always shown
        }}
      />

      {/* 4. Alerts / Notifications */}
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size - 3} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />

      {/* 5. More Hub */}
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <MoreHorizontal color={color} size={size - 3} />,
        }}
      />

      {/* Hidden Screens (accessible via router push but not in the tab bar) */}
      <Tabs.Screen
        name="visited"
        options={{ 
          title: 'Visited', 
          tabBarIcon: ({ color, size }) => <ClipboardCheck color={color} size={size - 3} />,
          href: null 
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ 
          title: 'Profile', 
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          href: null 
        }}
      />
    </Tabs>
  );
}
