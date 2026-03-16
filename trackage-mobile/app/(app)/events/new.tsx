import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../lib/AuthContext';
import { createEvent, BASE_URL } from '../../../lib/api';
import { colors, fonts } from '../../../lib/theme';

interface TicketDraft {
  _id: string;
  name: string;
  price: string;
  inventory: string;
  sale_start: Date | null;
  sale_end: Date | null;
}

interface VenuePrediction {
  description: string;
  place_id: string;
}

interface PickerState {
  target: 'start' | 'end' | 'ticket_sale_start' | 'ticket_sale_end';
  step: 'date' | 'time';
  tempDate: Date;
  ticketId?: string;
}

function uid() { return Math.random().toString(36).slice(2, 9); }

function formatDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Europe/Malta',
  }).format(date).replace(',', '');
}

export default function CreateEventScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [tickets, setTickets] = useState<TicketDraft[]>([
    { _id: uid(), name: 'General Admission', price: '', inventory: '', sale_start: null, sale_end: null },
  ]);

  // Venue search
  const [venueQuery, setVenueQuery] = useState('');
  const [venuePredictions, setVenuePredictions] = useState<VenuePrediction[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<{ name: string; maps_url: string } | null>(null);
  const [venueSearching, setVenueSearching] = useState(false);
  const venueDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Date/time picker state
  const [pickerState, setPickerState] = useState<PickerState | null>(null);

  // Venue search debounce
  useEffect(() => {
    if (venueDebounce.current) clearTimeout(venueDebounce.current);
    if (!venueQuery.trim() || selectedVenue) {
      setVenuePredictions([]);
      return;
    }
    venueDebounce.current = setTimeout(async () => {
      setVenueSearching(true);
      try {
        const res = await fetch(
          `${BASE_URL}/api/organiser/places?q=${encodeURIComponent(venueQuery)}`,
          { headers: { Authorization: `Bearer ${session!.access_token}` } }
        );
        const data = await res.json();
        console.log('[venue search]', res.status, JSON.stringify(data));
        setVenuePredictions(data.predictions || []);
      } catch (err) { console.error('[venue search error]', err); } finally { setVenueSearching(false); }
    }, 350);
    return () => { if (venueDebounce.current) clearTimeout(venueDebounce.current); };
  }, [venueQuery, selectedVenue]);

  async function selectVenuePrediction(pred: VenuePrediction) {
    setVenuePredictions([]);
    setVenueSearching(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/organiser/places?place_id=${encodeURIComponent(pred.place_id)}`,
        { headers: { Authorization: `Bearer ${session!.access_token}` } }
      );
      const data = await res.json();
      setSelectedVenue({ name: data.name || pred.description, maps_url: data.maps_url || '' });
      setVenueQuery('');
    } catch {
      setSelectedVenue({ name: pred.description, maps_url: '' });
      setVenueQuery('');
    } finally { setVenueSearching(false); }
  }

  // ── Date picker helpers ──────────────────────────────────────
  function openPicker(target: 'start' | 'end') {
    const current = target === 'start' ? startDate : endDate;
    setPickerState({ target, step: 'date', tempDate: current ?? new Date() });
  }

  function openTicketPicker(ticketId: string, field: 'sale_start' | 'sale_end') {
    const ticket = tickets.find(t => t._id === ticketId);
    const current = ticket?.[field];
    const target = field === 'sale_start' ? 'ticket_sale_start' as const : 'ticket_sale_end' as const;
    setPickerState({ target, step: 'date', tempDate: current ?? new Date(), ticketId });
  }

  function applyPickerResult(date: Date) {
    if (!pickerState) return;
    if (pickerState.target === 'start') setStartDate(date);
    else if (pickerState.target === 'end') setEndDate(date);
    else if (pickerState.ticketId) {
      const field = pickerState.target === 'ticket_sale_start' ? 'sale_start' : 'sale_end';
      setTickets(ts => ts.map(t => t._id === pickerState.ticketId ? { ...t, [field]: date } : t));
    }
  }

  // Android: date dialog then time dialog sequentially
  function handleAndroidPickerChange(_: any, date?: Date) {
    if (!pickerState) return;
    if (!date) { setPickerState(null); return; }
    if (pickerState.step === 'date') {
      setPickerState({ ...pickerState, step: 'time', tempDate: date });
    } else {
      applyPickerResult(date);
      setPickerState(null);
    }
  }

  // iOS: modal with spinner pickers
  function handleIOSPickerChange(_: any, date?: Date) {
    if (!pickerState || !date) return;
    setPickerState({ ...pickerState, tempDate: date });
  }

  function confirmIOSStep() {
    if (!pickerState) return;
    if (pickerState.step === 'date') {
      setPickerState({ ...pickerState, step: 'time' });
    } else {
      applyPickerResult(pickerState.tempDate);
      setPickerState(null);
    }
  }

  // ── Ticket helpers ───────────────────────────────────────────
  function addTicket() {
    setTickets(ts => [...ts, { _id: uid(), name: '', price: '', inventory: '', sale_start: null, sale_end: null }]);
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

    setSaving(true);
    try {
      const result = await createEvent({
        event: {
          name: name.trim(),
          description: description.trim() || null,
          start_time: startDate ? startDate.toISOString() : null,
          end_time: endDate ? endDate.toISOString() : null,
          venue_name: selectedVenue?.name ?? null,
          venue_maps_url: selectedVenue?.maps_url ?? null,
          status,
        },
        tickets: tickets.map(t => ({
          name: t.name.trim() || 'General Admission',
          price: parseFloat(t.price) || 0,
          inventory: t.inventory !== '' ? parseInt(t.inventory) : null,
          sale_start: t.sale_start ? t.sale_start.toISOString() : null,
          sale_end: t.sale_end ? t.sale_end.toISOString() : null,
        })),
        days: [],
      }, session!.access_token);

      if (result.event_id) {
        Alert.alert('Event Created!', `"${name.trim()}" has been created.`, [
          {
            text: 'Open Event',
            onPress: () => router.replace({ pathname: '/(app)/events/[id]', params: { id: result.event_id! } }),
          },
          { text: 'Back to Events', onPress: () => router.replace('/(app)/events') },
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

          {/* Date/Time Pickers */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>START (Malta Time)</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker('start')} activeOpacity={0.7}>
                <Text style={startDate ? styles.dateBtnText : styles.dateBtnPlaceholder}>
                  {startDate ? formatDisplayDate(startDate) : 'Select date & time'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>END (Malta Time)</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker('end')} activeOpacity={0.7}>
                <Text style={endDate ? styles.dateBtnText : styles.dateBtnPlaceholder}>
                  {endDate ? formatDisplayDate(endDate) : 'Select date & time'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Venue */}
          <View style={[styles.field, { marginTop: 4 }]}>
            <Text style={styles.label}>VENUE</Text>
            {selectedVenue ? (
              <View style={styles.venueChip}>
                <Text style={styles.venueChipText} numberOfLines={1}>📍 {selectedVenue.name}</Text>
                <TouchableOpacity onPress={() => setSelectedVenue(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.venueChipChange}>× Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.input}
                  value={venueQuery}
                  onChangeText={setVenueQuery}
                  placeholder="Search for a venue…"
                  placeholderTextColor={colors.muted}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
                {venueSearching && (
                  <ActivityIndicator size="small" color={colors.muted} style={{ position: 'absolute', right: 12, top: 12 }} />
                )}
                {venuePredictions.length > 0 && (
                  <View style={styles.predictionsList}>
                    {venuePredictions.map(pred => (
                      <TouchableOpacity
                        key={pred.place_id}
                        style={styles.predictionItem}
                        onPress={() => selectVenuePrediction(pred)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.predictionText} numberOfLines={2}>📍 {pred.description}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
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

              <View style={styles.row}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>SALE START</Text>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => openTicketPicker(t._id, 'sale_start')} activeOpacity={0.7}>
                    <Text style={t.sale_start ? styles.dateBtnText : styles.dateBtnPlaceholder}>
                      {t.sale_start ? formatDisplayDate(t.sale_start) : 'Optional'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>SALE END</Text>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => openTicketPicker(t._id, 'sale_end')} activeOpacity={0.7}>
                    <Text style={t.sale_end ? styles.dateBtnText : styles.dateBtnPlaceholder}>
                      {t.sale_end ? formatDisplayDate(t.sale_end) : 'Optional'}
                    </Text>
                  </TouchableOpacity>
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

      {/* ── iOS Date/Time Picker Modal ── */}
      {Platform.OS === 'ios' && pickerState && (
        <Modal transparent animationType="slide">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setPickerState(null)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>
                  {pickerState.target === 'start' ? 'Start' : pickerState.target === 'end' ? 'End' : pickerState.target === 'ticket_sale_start' ? 'Sale Start' : 'Sale End'} —{' '}
                  {pickerState.step === 'date' ? 'Pick Date' : 'Pick Time'}
                </Text>
                <TouchableOpacity onPress={confirmIOSStep}>
                  <Text style={styles.pickerConfirm}>
                    {pickerState.step === 'date' ? 'Next →' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerState.tempDate}
                mode={pickerState.step}
                display="spinner"
                onChange={handleIOSPickerChange}
                style={styles.iosPicker}
                timeZoneName="Europe/Malta"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* ── Android Date/Time Picker (dialog) ── */}
      {Platform.OS === 'android' && pickerState && (
        <DateTimePicker
          value={pickerState.tempDate}
          mode={pickerState.step}
          display="default"
          onChange={handleAndroidPickerChange}
          timeZoneName="Europe/Malta"
        />
      )}
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

  // Date button
  dateBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: colors.surface,
  },
  dateBtnText: { fontSize: 13, fontFamily: fonts.regular, color: colors.black },
  dateBtnPlaceholder: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted },

  // Venue
  venueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.greenDim,
    borderWidth: 1.5,
    borderColor: colors.green,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  venueChipText: { flex: 1, fontSize: 14, fontFamily: fonts.regular, color: colors.green },
  venueChipChange: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.muted },
  predictionsList: {
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  predictionItem: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  predictionText: { fontSize: 13, fontFamily: fonts.regular, color: colors.black },

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

  // iOS picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pickerTitle: { fontSize: 15, fontFamily: fonts.bold, color: '#111' },
  pickerCancel: { fontSize: 15, fontFamily: fonts.regular, color: colors.muted },
  pickerConfirm: { fontSize: 15, fontFamily: fonts.bold, color: colors.green },
  iosPicker: { backgroundColor: '#fff' },
});
