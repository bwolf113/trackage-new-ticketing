import { Stack } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../lib/AuthContext';

export default function AppLayout() {
  const { signOut } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Back',
        headerRight: () => (
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="events/index" options={{ title: 'My Events' }} />
      <Stack.Screen name="events/[id]/index" options={{ title: '' }} />
      <Stack.Screen name="events/[id]/scan" options={{ title: 'Scan Tickets', headerRight: () => null }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  signOutBtn: { marginRight: 4, padding: 4 },
  signOutText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
