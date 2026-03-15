import { Stack } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../lib/AuthContext';
import { colors, fonts } from '../../lib/theme';

export default function AppLayout() {
  const { signOut } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.black },
        headerTintColor: colors.white,
        headerTitleStyle: { fontFamily: fonts.bold },
        headerBackTitle: 'Back',
        headerRight: () => (
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="events/index" options={{ title: 'My Events' }} />
      <Stack.Screen name="events/new" options={{ title: 'Create Event' }} />
      <Stack.Screen name="events/[id]/index" options={{ title: '' }} />
      <Stack.Screen name="events/[id]/scan" options={{ title: 'Scan Tickets', headerRight: () => null }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  signOutBtn: { marginRight: 4, padding: 4 },
  signOutText: { color: colors.white, fontSize: 14, fontFamily: fonts.semiBold },
});
