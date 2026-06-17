import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import type { ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Component, ReactNode, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/auth/AuthContext';
import { getApiConfigError } from '@/config/runtime';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <View
        style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 24,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2328', textAlign: 'center' }}>
          Une erreur est survenue
        </Text>
        <Text style={{ marginTop: 10, color: '#6B7280', textAlign: 'center' }}>
          {error.message}
        </Text>
        <Pressable
          onPress={retry}
          style={{
            marginTop: 16,
            height: 46,
            paddingHorizontal: 20,
            borderRadius: 12,
            backgroundColor: '#18A7A0',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Réessayer</Text>
        </Pressable>
      </View>
    </SafeAreaProvider>
  );
}

const publicRoutes = new Set(['/', '/login', '/resident-login', '/syndic-login', '/otp']);

const residentRoutes = [
  '/residence',
  '/home',
  '/payments',
  '/documents',
  '/profile',
  '/notifications',
  '/announcements',
  '/complaints',
];

const syndicRoles = new Set([
  'SYNDIC',
  'VICE_SYNDIC',
  'CAISSIER',
  'CASHIER',
  'GARDIEN',
  'SECRETAIRE',
]);

function getRoleHome(role?: string) {
  if (role && syndicRoles.has(role)) {
    return '/syndic/dashboard';
  }

  if (role === 'RESIDENT') {
    return '/residence';
  }

  return '/login';
}

class GlobalRenderBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[root] render error', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <View style={styles.configErrorScreen}>
            <Text style={styles.configErrorTitle}>Une erreur est survenue</Text>
            <Text style={styles.configErrorText}>Veuillez redémarrer l&apos;application</Text>
          </View>
        </SafeAreaProvider>
      );
    }

    return this.props.children;
  }
}

function isResidentRoute(pathname: string) {
  return residentRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function RouteGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, isLoggingOut, user } = useAuth();

  useEffect(() => {
    if (isLoading || isLoggingOut) {
      return;
    }

    const isPublicRoute = publicRoutes.has(pathname);

    if (!isAuthenticated && !isPublicRoute) {
      console.log('[route-guard] redirect target:', '/login');
      router.replace('/login');
      return;
    }

    if (!isAuthenticated) {
      return;
    }

    const roleHome = getRoleHome(user?.role);

    if (isPublicRoute) {
      console.log('[route-guard] redirect target:', roleHome);
      router.replace(roleHome);
      return;
    }

    if (user?.role === 'RESIDENT' && pathname.startsWith('/syndic')) {
      console.log('[route-guard] redirect target:', '/residence');
      router.replace('/residence');
      return;
    }

    if (user?.role && syndicRoles.has(user.role) && isResidentRoute(pathname)) {
      console.log('[route-guard] redirect target:', '/syndic/dashboard');
      router.replace('/syndic/dashboard');
    }
  }, [isAuthenticated, isLoading, isLoggingOut, pathname, router, user?.role]);

  return null;
}

function AppStack() {
  const { connectionError, isLoading } = useAuth();
  const apiConfigError = getApiConfigError();

  useEffect(() => {
    if (!isLoading || apiConfigError) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [apiConfigError, isLoading]);

  if (apiConfigError) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View style={styles.configErrorScreen}>
          <Text style={styles.configErrorTitle}>Configuration requise</Text>
          <Text style={styles.configErrorText}>
            {apiConfigError} Configurez EXPO_PUBLIC_API_URL dans EAS puis reconstruisez l&apos;APK.
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RouteGuard />
      {!!connectionError && (
        <View style={styles.connectionBanner}>
          <Text style={styles.connectionText}>{connectionError}</Text>
        </View>
      )}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="resident-login" />
        <Stack.Screen name="syndic-login" />
        <Stack.Screen name="otp" />
        <Stack.Screen name="residence" />
        <Stack.Screen name="residence/details" />
        <Stack.Screen name="home" />
        <Stack.Screen name="payments" />
        <Stack.Screen name="payments/[id]" />
        <Stack.Screen name="documents" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="notifications/[id]" />
        <Stack.Screen name="announcements" />
        <Stack.Screen name="announcements/[id]" />
        <Stack.Screen name="complaints/index" />
        <Stack.Screen name="complaints/new" />
        <Stack.Screen name="complaints/[id]" />
        <Stack.Screen name="syndic/dashboard" />
        <Stack.Screen name="syndic/residences" />
        <Stack.Screen name="syndic/apartments" />
        <Stack.Screen name="syndic/apartments/[id]" />
        <Stack.Screen name="syndic/residents" />
        <Stack.Screen name="syndic/payments" />
        <Stack.Screen name="syndic/complaints" />
        <Stack.Screen name="syndic/notifications" />
        <Stack.Screen name="syndic/announcements" />
        <Stack.Screen name="syndic/documents" />
        <Stack.Screen name="syndic/assistant" />
        <Stack.Screen name="syndic/team" />
        <Stack.Screen name="syndic/team/new" />
        <Stack.Screen name="syndic/team/[id]" />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <GlobalRenderBoundary>
      <AuthProvider>
        <AppStack />
      </AuthProvider>
    </GlobalRenderBoundary>
  );
}

const styles = StyleSheet.create({
  connectionBanner: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    zIndex: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  connectionText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  configErrorScreen: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  configErrorTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  configErrorText: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});
