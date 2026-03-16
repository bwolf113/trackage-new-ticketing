import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView, Image,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getOrganiserMe, BASE_URL } from '../../lib/api';
import { colors, fonts } from '../../lib/theme';

export default function SignupScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  async function handleSignup() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirm) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: fullName } },
      });

      if (authError) {
        Alert.alert('Signup failed', authError.message);
        setLoading(false);
        return;
      }

      // If email confirmation is required
      if (!data.session) {
        setSuccess('Account created! Check your email to confirm your address, then sign in.');
        setLoading(false);
        return;
      }

      // Auto-confirmed — create organiser profile
      const res = await fetch(`${BASE_URL}/api/organiser/me`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ name: fullName }),
      });
      const json = await res.json();

      if (!json.organiser) {
        Alert.alert('Error', json.error || 'Profile creation failed.');
        setLoading(false);
        return;
      }

      // AuthContext will pick up the new session via onAuthStateChange → redirect to events
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.black }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://bflmjuzmmuhytkxpdrbw.supabase.co/storage/v1/object/public/emails/brand/logo-white.png' }}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.dashboard}>Organiser Dashboard</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Start selling tickets in minutes</Text>

          {success ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : (
            <>
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>First name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Jane"
                    placeholderTextColor={colors.muted}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    autoComplete="given-name"
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Last name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Smith"
                    placeholderTextColor={colors.muted}
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    autoComplete="family-name"
                  />
                </View>
              </View>

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Min. 6 characters"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />

              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter password"
                placeholderTextColor={colors.muted}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoComplete="new-password"
              />

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.btnText}>Create account</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 200,
    height: 60,
    marginBottom: 16,
  },
  dashboard: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.semiBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.black,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.muted,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.black,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.black,
    backgroundColor: colors.surface,
  },
  successBox: {
    backgroundColor: colors.successBg,
    borderRadius: 8,
    padding: 14,
    marginTop: 16,
  },
  successText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.success,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  backLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  backText: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: fonts.medium,
    textDecorationLine: 'underline',
  },
});
