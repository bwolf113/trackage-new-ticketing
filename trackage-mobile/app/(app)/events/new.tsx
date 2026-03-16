import { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../lib/AuthContext';
import { createEvent } from '../../../lib/api';
import { colors, fonts } from '../../../lib/theme';

interface TicketDraft {
  _id: string;
  name: string;
  price: string;
  inventory: string;
}

function uid() { return Math.random().toString(36).slice(2, 9); }

// Convert Malta local datetime string → UTC ISO (handles DST correctly)
function maltaDTtoUTC(str: string): string | null {
  if (!str.trim()) return null;
  const normalized = str.trim().replace(' ', 'T');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) return null;
  const [yr, mo, da, hr, mi] = normalized.replace('T', '-').split(/[:\-]/).map(Number);
  let utcMs = Date.UTC(yr, mo - 1, da, hr, mi);
  for (let i = 0; i < 3; i++) {
    const d = new Date(utcMs);
    const ps = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Malta',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d);
    const get = (t: string) => parseInt(ps.find(p => p.type === t)?.value ?? '0');
    const maltaMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
    const diff = Date.UTC(yr, mo - 1, da, hr, mi) - maltaMs;
    if (Math.abs(diff) < 60000) break;
    utcMs += diff;
  }
  return new Date(utcMs).toISOString();
}

export default function CreateEventScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venueName, setVenueName] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [tickets, setTickets] = useState<TicketDraft[]>([
    { _id: uid(), name: 'General Admission', price: '', inventory: '' },
  ]);

  function addTicket() {
    setTickets(ts => [...ts, { _id: uid(), name: '', price: '', inventory: '' }]);
  }

  function removeTicket(id: string) {
    setTickets(ts => ts.filter(t => t._id !== id));
  }

  function updateTicket(id: string, field: keyof Omit<TicketDraft, '_id'>, value: string) {
    setTickets(ts => ts.map(t => t._id === id ? { ...t, [field]: value } : t));
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Missing Field', 'Event name is required.');
      return;
    }
    for (const t of tickets) {
      if (!t.name.trim()) {
        Alert.alert('Missing Field', 'All tickets must have a name.');
        return;
      }
      if (t.price !== '' && isNaN(parseFloat(t.price))) {
        Alert.alert('Invalid Price', `Price for "${t.name}" is not a valid number.`);
        return;
      }
    }

    const parsedStart = startTime ? maltaDTtoUTC(startTime) : null;
    const parsedEnd = endTime ? maltaDTtoUTC(endTime) : null;

    if (startTime && !parsedStart) {
      Alert.alert('Invalid Date', 'Start date/time must be in format YYYY-MM-DD HH:MM\ne.g. 2026-04-16 20:00');
      return;
    }
    if (endTime && !parsedEnd) {
      Alert.alert('Invalid Date', 'End date/time must be in format YYYY-MM-DD HH:MM\ne.g. 2026-04-17 02:00');
      return;
    }

    setSaving(true);
    try {
      const result = await createEvent({
        event: {
          name: name.trim(),
          description: description.trim() || null,
          start_time: parsedStart,
          end_time: parsedEnd,
          venue_name: venueName.trim() || null,
          status,
        },
        tickets: tickets.map(t => ({
          name: t.name.trim() || 'General Admission',
          price: parseFloat(t.price) || 0,
          inventory: t.inventory !== '' ? parseInt(t.inventory) : null,
        })),
        days: [],
      }, session!.access_token);

      if (result.event_id) {
        Alert.alert('Event Created!', `"${name.trim()}" has been created.`, [
          {
            text: 'Open Event',
            onPress: () => router.replace({ pathname: '/(app)/events/[id]', params: { id: result.event_id! } }),
          },
          {
            text: 'Back to Events',
            onPress: () => router.replace('/(app)/events'),
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to create event.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Event Details ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Details</Text>

          <View style={styles.field}>
            <Text style={styles.label}>EVENT NAME *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Rock the South 2026"
              placeholderTextColor={colors.muted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>DESCRIPTION</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Tell people what to expect…"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>START (Malta Time)</Text>
              <TextInput
                style={styles.input}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="2026-04-16 20:00"
                placeholderTextColor={colors.muted}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>END (Malta Time)</Text>
              <TextInput
                style={styles.input}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="2026-04-17 02:00"
                placeholderTextColor={colors.muted}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
          <Text style={styles.hint}>Format: YYYY-MM-DD HH:MM (e.g. 2026-04-16 20:00)</Text>

          <View style={[styles.field, { marginTop: 12 }]}>
            <Text style={styles.label}>VENUE</Text>
            <TextInput
              style={styles.input}
              value={venueName}
              onChangeText={setVenueName}
              placeholder="e.g. The Grand Social, Valletta"
              placeholderTextColor={colors.muted}
            />
          </View>
        </View>

        {/* ── Status ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, status === 'draft' && styles.toggleActiveDraft]}
              onPress={() => setStatus('draft')}
            >
              <Text style={[styles.toggleText, status === 'draft' && styles.toggleTextDraft]}>Draft</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, status === 'published' && styles.toggleActivePub]}
              onPress={() => setStatus('published')}
            >
              <Text style={[styles.toggleText, status === 'published' && styles.toggleTextPub]}>Published</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Published events are visible to the public.</Text>
        </View>

        {/* ── Tickets ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tickets</Text>
          {tickets.map((t, i) => (
            <View key={t._id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketLabel}>Ticket {i + 1}</Text>
                {tickets.length > 1 && (
                  <TouchableOpacity onPress={() => removeTicket(t._id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.removeText}>✕ Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>NAME</Text>
                <TextInput
                  style={styles.input}
                  value={t.name}
                  onChangeText={v => updateTicket(t._id, 'name', v)}
                  placeholder="General Admission"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>PRICE (€)</Text>
                  <TextInput
                    style={styles.input}
                    value={t.price}
                    onChangeText={v => updateTicket(t._id, 'price', v)}
                    placeholder="0.00"
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>INVENTORY</Text>
                  <TextInput
                    style={styles.input}
                    value={t.inventory}
                    onChangeText={v => updateTicket(t._id, 'inventory', v)}
                    placeholder="Unlimited"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addTicketBtn} onPress={addTicket} activeOpacity={0.7}>
            <Text style={styles.addTicketText}>+ Add Ticket Type</Text>
          </TouchableOpacity>
        </View>

        {/* ── Save ── */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={styles.saveBtnText}>Create Event</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },

  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.black,
    marginBottom: 14,
  },

  field: { marginBottom: 12 },
  label: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.black,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 88, paddingTop: 10 },
  row: { flexDirection: 'row', gap: 10 },
  hint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.muted,
    marginTop: 2,
  },

  toggle: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  toggleBtn: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  toggleActiveDraft: { backgroundColor: colors.bg },
  toggleActivePub:   { backgroundColor: colors.greenDim },
  toggleText:        { fontSize: 13, fontFamily: fonts.semiBold, color: colors.muted },
  toggleTextDraft:   { color: colors.black },
  toggleTextPub:     { color: colors.green },

  ticketCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ticketLabel: { fontSize: 13, fontFamily: fonts.bold, color: colors.black },
  removeText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.danger },

  addTicketBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 2,
  },
  addTicketText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.muted },

  saveBtn: {
    backgroundColor: colors.black,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { fontSize: 15, fontFamily: fonts.bold, color: colors.white },
});
