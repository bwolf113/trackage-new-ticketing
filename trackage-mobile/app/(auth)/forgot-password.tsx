import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView, Image,
} from 'react-native';
import { router } from 'expo-router';
import { colors, fonts } from '../../lib/theme';

const API_BASE = 'https://tickets.trackagescheme.com';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  async function handleReset() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/organiser/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Something went wrong. Please try again.');
      }

      setSent(true);
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
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
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a link to reset your password.
          </Text>

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
            editable={!loading}
          />

          {sent && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                If an account exists for that email, a reset link has been sent. Check your inbox.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, (loading || cooldown > 0) && styles.btnDisabled]}
            onPress={handleReset}
            disabled={loading || cooldown > 0}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : cooldown > 0 ? (
              <Text style={styles.btnText}>Resend in {cooldown}s</Text>
            ) : (
              <Text style={styles.btnText}>{sent ? 'Resend link' : 'Send reset link'}</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backText}>Back to sign in</Text>
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
    padding: 12,
    marginTop: 16,
  },
  successText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.success,
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
