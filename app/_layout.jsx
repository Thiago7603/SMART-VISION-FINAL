import { AuthProvider } from '@context/AuthContext';
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
