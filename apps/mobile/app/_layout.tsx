/**
 * Layout raiz do app mobile (Expo Router).
 * Configura React Query, status bar e importa os estilos NativeWind.
 */
import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#1B5E20' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '800' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="station/[id]" options={{ title: 'Posto' }} />
          <Stack.Screen name="report" options={{ title: 'Reportar preço', presentation: 'modal' }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
