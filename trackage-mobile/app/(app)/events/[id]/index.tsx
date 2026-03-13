import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, RefreshControl, Alert, TextInput, Modal, FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useAuth } from '../../../../lib/AuthContext';
import {
  getEventOrders, getEventAttendees, getEventStats, issueComp, BASE_URL,
} from '../../../../lib/api';

const GREEN = '#0a9e7f';
type Tab = 'orders' | 'attendees' | 'stats' | 'comps';

function fmtDate(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtEur(n: number) {
  const val = n || 0;
  const hasCents = val % 1 !== 0;
  return new Intl.NumberFormat('en-MT', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(val);
}
function fmtTime(dt: string | null) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('en-MT', { hour: '2-digit', minute: '2-digit' });
}

// ── Stat card ──
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Orders Tab ──
function OrdersTab({ eventId, organiserId }: { eventId: string; organiserId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const d = await getEventOrders(eventId, organiserId);
      setData(d);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => { load(); }, []);

  if (loading) return <View style={styles.tabCenter}><ActivityIndicator color={GREEN} /></View>;

  const orders: any[] = data?.orders || [];
  const stats = data?.stats || {};
  const summary: any[] = data?.ticketSummary || [];

  return (
    <ScrollView
      style={styles.tabScroll}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={GREEN} />}
    >
      {/* Summary stats */}
      <View style={styles.statsRow}>
        <StatCard label="Revenue" value={fmtEur(stats.total_revenue)} />
        <StatCard label="Tickets sold" value={stats.tickets_sold ?? 0} />
        <StatCard label="Orders" value={stats.order_count ?? 0} />
      </View>

      {/* Ticket type summary */}
      {summary.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ticket Sales</Text>
          {summary.map((t: any, i: number) => (
            <View key={i} style={styles.ticketRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ticketName}>{t.name}</Text>
                <Text style={styles.ticketPrice}>{fmtEur(t.price)}</Text>
              </View>
              <Text style={styles.ticketSold}>
                {t.sold} / {t.inventory ?? '∞'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Order list */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Orders ({orders.length})</Text>
        {orders.length === 0
          ? <Text style={styles.emptyText}>No orders yet.</Text>
          : orders.map((o: any) => (
            <View key={o.id} style={styles.orderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderName}>{o.customer_name || '—'}</Text>
                <Text style={styles.orderEmail}>{o.customer_email || ''}</Text>
                <Text style={styles.orderMeta}>{fmtDate(o.created_at)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.orderTotal}>{fmtEur(o.total)}</Text>
                <View style={[styles.statusBadge, o.status === 'completed' ? styles.statusOk : styles.statusOther]}>
                  <Text style={[styles.statusText, o.status === 'completed' ? styles.statusOkText : styles.statusOtherText]}>
                    {o.status}
                  </Text>
                </View>
              </View>
            </View>
          ))
        }
      </View>
    </ScrollView>
  );
}

// ── Attendees Tab ──
function AttendeesTab({ eventId, organiserId }: { eventId: string; organiserId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const d = await getEventAttendees(eventId, organiserId);
      setData(d);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => { load(); }, []);

  if (loading) return <View style={styles.tabCenter}><ActivityIndicator color={GREEN} /></View>;

  const attendees: any[] = (data?.attendees || []).filter((a: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q);
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchWrap}>
        <View style={styles.searchIconWrap}>
          <View style={styles.searchCircle} />
          <View style={styles.searchHandle} />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search attendees…"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlatList
        data={attendees}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={GREEN} />}
        ListEmptyComponent={<Text style={styles.emptyText}>{search ? 'No matches.' : 'No attendees yet.'}</Text>}
        renderItem={({ item: a }) => (
          <View style={styles.attendeeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.attendeeName}>{a.name || '—'}</Text>
              <Text style={styles.attendeeEmail}>{a.email || ''}</Text>
              {a.ticket_summary
                ? <Text style={styles.attendeeMeta}>{a.ticket_summary}</Text>
                : (a.tickets || []).map((t: any, i: number) => (
                    <Text key={i} style={styles.attendeeMeta}>{t.quantity}× {t.ticket_name}</Text>
                  ))
              }
            </View>
            <Text style={styles.attendeeRef}>#{a.order_id?.slice(-6).toUpperCase()}</Text>
          </View>
        )}
      />
    </View>
  );
}

// ── Stats Tab ──
function StatsTab({ eventId, organiserId }: { eventId: string; organiserId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const d = await getEventStats(eventId, organiserId);
      setData(d);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => { load(); }, []);

  if (loading) return <View style={styles.tabCenter}><ActivityIndicator color={GREEN} /></View>;

  const summary = data?.summary || {};
  const dailySales: any[] = data?.daily_sales || [];
  const typeNames: string[] = data?.ticket_type_names || [];
  const dailyByType: any[] = data?.daily_by_type || [];

  return (
    <ScrollView
      style={styles.tabScroll}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={GREEN} />}
    >
      {/* Summary */}
      <View style={styles.statsRow}>
        <StatCard label="Paid tickets" value={summary.total_tickets_sold ?? 0} />
        <StatCard label="Comp tickets" value={summary.total_comp_tickets ?? 0} />
        <StatCard label="Ticket types" value={summary.total_ticket_types ?? 0} />
      </View>

      {/* Daily sales table */}
      {dailySales.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Sales</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHead, { flex: 2 }]}>Date</Text>
            <Text style={[styles.tableCell, styles.tableHead]}>Tickets</Text>
            <Text style={[styles.tableCell, styles.tableHead]}>Revenue</Text>
          </View>
          {dailySales.map((row: any, i: number) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{row.date}</Text>
              <Text style={styles.tableCell}>{row.tickets}</Text>
              <Text style={styles.tableCell}>{fmtEur(row.revenue)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Daily by ticket type */}
      {typeNames.length > 1 && dailyByType.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sales by Ticket Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.tableHead, { width: 90 }]}>Date</Text>
                {typeNames.map(n => (
                  <Text key={n} style={[styles.tableCell, styles.tableHead, { width: 80 }]}>{n}</Text>
                ))}
              </View>
              {dailyByType.map((row: any, i: number) => (
                <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, { width: 90 }]}>{row.date}</Text>
                  {typeNames.map(n => (
                    <Text key={n} style={[styles.tableCell, { width: 80 }]}>{row[n] ?? 0}</Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {dailySales.length === 0 && (
        <Text style={styles.emptyText}>No sales data yet.</Text>
      )}
    </ScrollView>
  );
}

// ── Issue Comp Tab ──
function CompsTab({ eventId, organiserId }: { eventId: string; organiserId: string }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [rows, setRows] = useState([{ first_name: '', last_name: '', email: '', quantity: '1', ticket_id: '' }]);
  const [loading, setLoading] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  useEffect(() => {
    getEventOrders(eventId, organiserId).then(d => {
      // We don't have a dedicated tickets endpoint for organiser, but getEventOrders returns ticketSummary
      // We need ticket ids — use the stats/orders response to find them
      fetch(`${BASE_URL}/api/organiser/events/${eventId}?organiser_id=${organiserId}`)
        .then(r => r.json())
        .then(d => {
          setTickets(d.tickets || []);
          if (d.tickets?.length > 0) {
            setRows([{ first_name: '', last_name: '', email: '', quantity: '1', ticket_id: d.tickets[0].id }]);
          }
          setTicketsLoading(false);
        })
        .catch(() => setTicketsLoading(false));
    }).catch(() => setTicketsLoading(false));
  }, []);

  function updateRow(i: number, field: string, val: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  function addRow() {
    setRows(prev => [...prev, { first_name: '', last_name: '', email: '', quantity: '1', ticket_id: tickets[0]?.id || '' }]);
  }

  function removeRow(i: number) {
    if (rows.length === 1) return;
    setRows(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleIssue() {
    const valid = rows.every(r => r.first_name.trim() && r.email.trim());
    if (!valid) { Alert.alert('Missing fields', 'First name and email are required for all attendees.'); return; }

    setLoading(true);
    try {
      const result = await issueComp({
        organiser_id: organiserId,
        event_id: eventId,
        attendees: rows.map(r => ({
          first_name: r.first_name.trim(),
          last_name: r.last_name.trim(),
          email: r.email.trim().toLowerCase(),
          quantity: Math.max(1, parseInt(r.quantity) || 1),
          ticket_id: r.ticket_id || undefined,
        })),
      });
      if (result.sent > 0) {
        Alert.alert('Done', `${result.sent} comp ticket(s) issued successfully.`);
        setRows([{ first_name: '', last_name: '', email: '', quantity: '1', ticket_id: tickets[0]?.id || '' }]);
      } else {
        Alert.alert('Failed', result.results?.map((r: any) => r.error).filter(Boolean).join('\n') || 'Failed to issue comps.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  if (ticketsLoading) return <View style={styles.tabCenter}><ActivityIndicator color={GREEN} /></View>;

  return (
    <ScrollView style={styles.tabScroll} contentContainerStyle={[styles.tabContent, { paddingBottom: 40 }]}>
      <Text style={styles.compInfo}>Issue free (comp) tickets. Each recipient will receive a ticket confirmation email with a QR code.</Text>

      {rows.map((row, i) => (
        <View key={i} style={styles.compCard}>
          <View style={styles.compCardHeader}>
            <Text style={styles.compCardTitle}>Attendee {i + 1}</Text>
            {rows.length > 1 && (
              <TouchableOpacity onPress={() => removeRow(i)}>
                <Text style={styles.removeBtn}>✕ Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.label}>First name *</Text>
          <TextInput style={styles.input} value={row.first_name} onChangeText={v => updateRow(i, 'first_name', v)} placeholder="John" placeholderTextColor="#9ca3af" />

          <Text style={styles.label}>Last name</Text>
          <TextInput style={styles.input} value={row.last_name} onChangeText={v => updateRow(i, 'last_name', v)} placeholder="Doe" placeholderTextColor="#9ca3af" />

          <Text style={styles.label}>Email *</Text>
          <TextInput style={styles.input} value={row.email} onChangeText={v => updateRow(i, 'email', v)} placeholder="john@example.com" placeholderTextColor="#9ca3af" keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Quantity</Text>
          <TextInput style={styles.input} value={row.quantity} onChangeText={v => updateRow(i, 'quantity', v)} keyboardType="number-pad" />

          {tickets.length > 1 && (
            <>
              <Text style={styles.label}>Ticket type</Text>
              <View style={styles.ticketPicker}>
                {tickets.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.ticketOption, row.ticket_id === t.id && styles.ticketOptionSelected]}
                    onPress={() => updateRow(i, 'ticket_id', t.id)}
                  >
                    <Text style={[styles.ticketOptionText, row.ticket_id === t.id && styles.ticketOptionSelectedText]}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.addRowBtn} onPress={addRow}>
        <Text style={styles.addRowText}>+ Add another attendee</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.issueBtn, loading && styles.issueBtnDisabled]}
        onPress={handleIssue}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.issueBtnText}>Issue {rows.length} comp ticket{rows.length !== 1 ? 's' : ''}</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Main Event Detail Screen ──
export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { organiser } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const [tab, setTab] = useState<Tab>('orders');
  const [eventName, setEventName] = useState('Event');

  useEffect(() => {
    if (!organiser || !id) return;
    fetch(`${BASE_URL}/api/organiser/events/${id}?organiser_id=${organiser.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.event?.name) {
          setEventName(d.event.name);
          navigation.setOptions({ title: d.event.name });
        }
      })
      .catch(() => {});
  }, [id, organiser?.id]);

  if (!organiser || !id) return null;

  const TABS: { key: Tab; label: string }[] = [
    { key: 'orders',    label: 'Orders'    },
    { key: 'attendees', label: 'Attendees' },
    { key: 'stats',     label: 'Stats'     },
    { key: 'comps',     label: 'Issue Comp' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Scan button */}
      <TouchableOpacity
        style={styles.scanBanner}
        onPress={() => router.push({ pathname: '/(app)/events/[id]/scan', params: { id } })}
        activeOpacity={0.8}
      >
        <Text style={styles.scanBannerText}>Scan Tickets</Text>
      </TouchableOpacity>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {tab === 'orders'    && <OrdersTab    eventId={id} organiserId={organiser.id} />}
        {tab === 'attendees' && <AttendeesTab eventId={id} organiserId={organiser.id} />}
        {tab === 'stats'     && <StatsTab     eventId={id} organiserId={organiser.id} />}
        {tab === 'comps'     && <CompsTab     eventId={id} organiserId={organiser.id} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scanBanner: {
    backgroundColor: '#0891b2',
    paddingVertical: 13,
    alignItems: 'center',
  },
  scanBannerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: GREEN,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabBtnTextActive: {
    color: GREEN,
  },
  tabScroll: { flex: 1 },
  tabContent: { padding: 16, gap: 12 },
  tabCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statVal: { fontSize: 18, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 3, textAlign: 'center' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  ticketRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  ticketName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  ticketPrice: { fontSize: 12, color: '#6b7280' },
  ticketSold: { fontSize: 14, fontWeight: '700', color: GREEN },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  orderName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  orderEmail: { fontSize: 12, color: '#6b7280' },
  orderMeta: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  orderTotal: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  statusBadge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  statusOk: { backgroundColor: '#d1fae5' },
  statusOther: { backgroundColor: '#f3f4f6' },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusOkText: { color: '#065f46' },
  statusOtherText: { color: '#6b7280' },
  emptyText: { color: '#9ca3af', fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  searchIconWrap: { width: 16, height: 16, marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  searchCircle: {
    width: 11, height: 11, borderRadius: 6,
    borderWidth: 2, borderColor: '#9ca3af',
    position: 'absolute', top: 0, left: 0,
  },
  searchHandle: {
    width: 2, height: 5, borderRadius: 1,
    backgroundColor: '#9ca3af',
    position: 'absolute', bottom: 0, right: 1,
    transform: [{ rotate: '45deg' }],
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: '#111827' },
  attendeeRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  attendeeName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  attendeeEmail: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  attendeeMeta: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  attendeeRef: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: '#e5e7eb', paddingBottom: 6, marginBottom: 2 },
  tableHead: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 7 },
  tableRowAlt: { backgroundColor: '#f9fafb' },
  tableCell: { flex: 1, fontSize: 13, color: '#374151' },
  compInfo: { fontSize: 13, color: '#6b7280', marginBottom: 4, lineHeight: 19 },
  compCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  compCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  compCardTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  removeBtn: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827',
  },
  ticketPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  ticketOption: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  ticketOptionSelected: { borderColor: GREEN, backgroundColor: '#e6f7f3' },
  ticketOptionText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  ticketOptionSelectedText: { color: GREEN },
  addRowBtn: {
    borderWidth: 1.5, borderColor: GREEN, borderRadius: 10, borderStyle: 'dashed',
    paddingVertical: 12, alignItems: 'center',
  },
  addRowText: { color: GREEN, fontWeight: '700', fontSize: 14 },
  issueBtn: {
    backgroundColor: GREEN, borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
  },
  issueBtnDisabled: { opacity: 0.6 },
  issueBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
