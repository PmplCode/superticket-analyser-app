import '../global.css'
import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#f8fafc',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 20,
          color: '#0f172a',
        },
        headerTintColor: '#4f46e5',
        contentStyle: {
          backgroundColor: '#f8fafc',
        },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="tickets"
        options={{ title: 'Recent Tickets' }}
      />
    </Stack>
  );
}