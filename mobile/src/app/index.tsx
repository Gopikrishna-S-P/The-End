import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { LoadingView } from '@/components/ui';

export default function IndexRedirect() {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingView />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (role === 'PLATFORM_ADMIN') {
    return <Redirect href="/(platform)/(tabs)" />;
  }

  return <Redirect href="/(org)/(tabs)" />;
}
