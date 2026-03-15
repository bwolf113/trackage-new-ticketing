import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, RefreshControl, Alert, TextInput, Modal, FlatList, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useAuth } from '../../../../lib/AuthContext';
import {
  getEventOrders, getEventAttendees, getEventStats, issueComp, checkInOrder, undoCheckInOrder, BASE_URL,
} from '../../../../lib/api';
import { colors, fonts } from '../../../../lib/theme';

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

// ── Edit Order Modal ──
function EditOrderModal({
  order, accessToken, onClose, onUpdated,
}: {
  order: { id: string; customer_name: string; customer_email: string; status?: string; total?: number; created_at?: string };
  accessToken: string;
  onClose: () => void;
  onUpdated: (name: string, email: string) => void;
}) {
  const [name, setName] = useState(order.customer_name || '');
  const [email, setEmail] = useState(order.customer_email || '');
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${BASE_URL}/api/organiser/update-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ order_id: order.id, customer_name: name, customer_email: email }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ text: 'Details updated.', ok: true });
        onUpdated(name, email);
      } else {
        setMsg({ text: data.error || 'Save failed', ok: false });
      }
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setMsg(null);
    try {
      const res = await fetch(`${BASE_URL}/api/organiser/resend-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ order_id: order.id }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ text: `Ticket resent to ${data.to || email}.`, ok: true });
      } else {
        setMsg({ text: data.error || 'Resend failed', ok: false });
      }
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    } finally {
      setResending(false);
    }
  }

  const isComp = !order.total || order.total === 0;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView behavior="padding" style={{ width: '100%', alignItems: 'center' }}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Order #{order.id?.slice(0, 8).toUpperCase()}</Text>
                {order.created_at ? <Text style={styles.modalSub}>{fmtDate(order.created_at)}</Text> : null}
              </View>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              {msg && (
                <View style={[styles.msgBanner, msg.ok ? styles.msgOk : styles.msgErr]}>
                  <Text style={msg.ok ? styles.msgOkText : styles.msgErrText}>{msg.text}</Text>
                </View>
              )}

              <Text style={styles.modalLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                value={name}
                onChangeText={setName}
                placeholder="Customer name"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.modalLabel}>Email</Text>
              <TextInput
                style={styles.modalInput}
                value={email}
                onChangeText={setEmail}
                placeholder="customer@email.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.modalLabel}>Total Paid</Text>
              <Text style={[styles.modalValue, { color: colors.green }]}>
                {isComp ? '€0 (Free/Comp)' : fmtEur(order.total ?? 0)}
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              {order.status === 'completed' && (
                <TouchableOpacity
                  style={[styles.btnResend, resending && { opacity: 0.6 }]}
                  onPress={handleResend}
                  disabled={resending}
                >
                  <Text style={styles.btnResendText}>{resending ? 'Resending…' : '📧 Resend'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.btnSave, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.btnSaveText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ── Orders Tab ──
function OrdersTab({ eventId, accessToken }: { eventId: string; accessToken: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editOrder, setEditOrder] = useState<any | null>(null);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const d = await getEventOrders(eventId, accessToken);
      setData(d);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => { load(); }, []);

  if (loading) return <View style={styles.tabCenter}><ActivityIndicator color={colors.green} /></View>;

  const orders: any[] = data?.orders || [];
  const stats = data?.stats || {};
  const summary: any[] = data?.ticketSummary || [];

  return (
    <>
      {editOrder && (
        <EditOrderModal
          order={editOrder}
          accessToken={accessToken}
          onClose={() => setEditOrder(null)}
          onUpdated={(name, email) => {
            setData((d: any) => ({
              ...d,
              orders: (d?.orders || []).map((o: any) =>
                o.id === editOrder.id ? { ...o, customer_name: name, customer_email: email } : o
              ),
            }));
            setEditOrder((o: any) => o ? { ...o, customer_name: name, customer_email: email } : null);
          }}
        />
      )}
      <ScrollView
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.green} />}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.ticketName}>{t.name}</Text>
                    {t.status === 'sold_out' && (
                      <View style={styles.ticketSoldOutBadge}>
                        <Text style={styles.ticketSoldOutText}>Sold Out</Text>
                      </View>
                    )}
                  </View>
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
              <TouchableOpacity key={o.id} style={styles.orderRow} onPress={() => setEditOrder(o)} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderName}>{o.customer_name || '—'}</Text>
                  <Text style={styles.orderEmail}>{o.customer_email || ''}</Text>
                  <Text style={styles.orderMeta}>{fmtDate(o.created_at)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.orderTotal}>{!o.total || o.total === 0 ? '€0 (Comp)' : fmtEur(o.total)}</Text>
                  <View style={[styles.statusBadge, o.status === 'completed' ? styles.statusOk : styles.statusOther]}>
                    <Text style={[styles.statusText, o.status === 'completed' ? styles.statusOkText : styles.statusOtherText]}>
                      {o.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.rowChevron}>›</Text>
              </TouchableOpacity>
            ))
          }
        </View>
      </ScrollView>
    </>
  );
}

// ── Attendees Tab ──
function AttendeesTab({ eventId, accessToken }: { eventId: string; accessToken: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [editOrder, setEditOrder] = useState<any | null>(null);
  const [checkingIn, setCheckingIn] = useState<Record<string, boolean>>({});

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const d = await getEventAttendees(eventId, accessToken);
      setData(d);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function handleCheckIn(orderId: string) {
    setCheckingIn(c => ({ ...c, [orderId]: true }));
    try {
      const json = await checkInOrder(eventId, orderId, accessToken);
      if (json.success) {
        setData((d: any) => ({
          ...d,
          attendees: (d?.attendees || []).map((a: any) =>
            a.order_id === orderId
              ? { ...a, checked_in_at: json.checked_in_at, checkin_count: a.checkin_total }
              : a
          ),
        }));
      }
    } finally {
      setCheckingIn(c => ({ ...c, [orderId]: false }));
    }
  }

  async function handleUndoCheckIn(orderId: string) {
    setCheckingIn(c => ({ ...c, [orderId]: true }));
    try {
      const json = await undoCheckInOrder(eventId, orderId, accessToken);
      if (json.success) {
        setData((d: any) => ({
          ...d,
          attendees: (d?.attendees || []).map((a: any) =>
            a.order_id === orderId
              ? { ...a, checked_in_at: null, checkin_count: 0 }
              : a
          ),
        }));
      }
    } finally {
      setCheckingIn(c => ({ ...c, [orderId]: false }));
    }
  }

  if (loading) return <View style={styles.tabCenter}><ActivityIndicator color={colors.green} /></View>;

  const attendees: any[] = (data?.attendees || []).filter((a: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q);
  });

  return (
    <View style={{ flex: 1 }}>
      {editOrder && (
        <EditOrderModal
          order={editOrder}
          accessToken={accessToken}
          onClose={() => setEditOrder(null)}
          onUpdated={(name, email) => {
            setData((d: any) => ({
              ...d,
              attendees: (d?.attendees || []).map((a: any) =>
                a.order_id === editOrder.id ? { ...a, name, email } : a
              ),
            }));
            setEditOrder((o: any) => o ? { ...o, customer_name: name, customer_email: email } : null);
          }}
        />
      )}
      <View style={styles.searchWrap}>
        <View style={styles.searchIconWrap}>
          <View style={styles.searchCircle} />
          <View style={styles.searchHandle} />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search attendees…"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlatList
        data={attendees}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.green} />}
        ListEmptyComponent={<Text style={styles.emptyText}>{search ? 'No matches.' : 'No attendees yet.'}</Text>}
        renderItem={({ item: a }) => {
          const allIn = a.checkin_total > 0 && a.checkin_count === a.checkin_total;
          const partialIn = a.checkin_count > 0 && !allIn;
          const busy = checkingIn[a.order_id];
          return (
            <TouchableOpacity
              style={styles.attendeeRow}
              activeOpacity={0.7}
              onPress={() => setEditOrder({
                id: a.order_id,
                customer_name: a.name,
                customer_email: a.email,
                status: 'completed',
                total: a.total,
                created_at: a.created_at,
              })}
            >
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
              <View style={{ alignItems: 'flex-end', gap: 5 }}>
                <Text style={styles.attendeeRef}>#{a.order_id?.slice(-6).toUpperCase()}</Text>
                {allIn ? (
                  <>
                    <View style={styles.checkinBadge}>
                      <Text style={styles.checkinBadgeText}>✓ Checked in</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.btnUndo}
                      disabled={busy}
                      onPress={e => { e.stopPropagation?.(); handleUndoCheckIn(a.order_id); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.btnUndoText}>{busy ? '…' : 'Undo'}</Text>
                    </TouchableOpacity>
                  </>
                ) : partialIn ? (
                  <>
                    <View style={[styles.checkinBadge, styles.checkinPartial]}>
                      <Text style={[styles.checkinBadgeText, styles.checkinPartialText]}>{a.checkin_count}/{a.checkin_total} in</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.btnCheckin}
                      disabled={busy}
                      onPress={e => { e.stopPropagation?.(); handleCheckIn(a.order_id); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.btnCheckinText}>{busy ? '…' : 'Check in rest'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnUndo}
                      disabled={busy}
                      onPress={e => { e.stopPropagation?.(); handleUndoCheckIn(a.order_id); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.btnUndoText}>{busy ? '…' : 'Undo all'}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.btnCheckin}
                    disabled={busy}
                    onPress={e => { e.stopPropagation?.(); handleCheckIn(a.order_id); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.btnCheckinText}>{busy ? '…' : 'Check in'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ── Stats Tab ──
function StatsTab({ eventId, accessToken }: { eventId: string; accessToken: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const d = await getEventStats(eventId, accessToken);
      setData(d);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => { load(); }, []);

  if (loading) return <View style={styles.tabCenter}><ActivityIndicator color={colors.green} /></View>;

  const summary = data?.summary || {};
  const dailySales: any[] = data?.daily_sales || [];
  const typeNames: string[] = data?.ticket_type_names || [];
  const dailyByType: any[] = data?.daily_by_type || [];

  return (
    <ScrollView
      style={styles.tabScroll}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.green} />}
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
function CompsTab({ eventId, accessToken }: { eventId: string; accessToken: string }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [rows, setRows] = useState([{ first_name: '', last_name: '', email: '', quantity: '1', ticket_id: '' }]);
  const [loading, setLoading] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/api/organiser/events/${eventId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
        .then(d => {
          setTickets(d.tickets || []);
          if (d.tickets?.length > 0) {
            setRows([{ first_name: '', last_name: '', email: '', quantity: '1', ticket_id: d.tickets[0].id }]);
          }
          setTicketsLoading(false);
        })
        .catch(() => setTicketsLoading(false));
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
        event_id: eventId,
        attendees: rows.map(r => ({
          first_name: r.first_name.trim(),
          last_name: r.last_name.trim(),
          email: r.email.trim().toLowerCase(),
          quantity: Math.max(1, parseInt(r.quantity) || 1),
          ticket_id: r.ticket_id || undefined,
        })),
      }, accessToken);
      if (result.sent > 0) {
        const total = result.tickets_sent ?? result.sent;
        Alert.alert('Done', `${total} comp ticket${total !== 1 ? 's' : ''} issued successfully.`);
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

  if (ticketsLoading) return <View style={styles.tabCenter}><ActivityIndicator color={colors.green} /></View>;

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
          <TextInput style={styles.input} value={row.first_name} onChangeText={v => updateRow(i, 'first_name', v)} placeholder="John" placeholderTextColor={colors.muted} />

          <Text style={styles.label}>Last name</Text>
          <TextInput style={styles.input} value={row.last_name} onChangeText={v => updateRow(i, 'last_name', v)} placeholder="Doe" placeholderTextColor={colors.muted} />

          <Text style={styles.label}>Email *</Text>
          <TextInput style={styles.input} value={row.email} onChangeText={v => updateRow(i, 'email', v)} placeholder="john@example.com" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" />

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
          ? <ActivityIndicator color={colors.white} />
          : <Text style={styles.issueBtnText}>Issue {rows.length} comp ticket{rows.length !== 1 ? 's' : ''}</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Main Event Detail Screen ──
export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { organiser, session } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const [tab, setTab] = useState<Tab>('orders');
  const [eventName, setEventName] = useState('Event');
  const accessToken = session?.access_token || '';

  useEffect(() => {
    if (!organiser || !id || !accessToken) return;
    fetch(`${BASE_URL}/api/organiser/events/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
        {tab === 'orders'    && <OrdersTab    eventId={id} accessToken={accessToken} />}
        {tab === 'attendees' && <AttendeesTab eventId={id} accessToken={accessToken} />}
        {tab === 'stats'     && <StatsTab     eventId={id} accessToken={accessToken} />}
        {tab === 'comps'     && <CompsTab     eventId={id} accessToken={accessToken} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scanBanner: {
    backgroundColor: colors.green,
    paddingVertical: 13,
    alignItems: 'center',
  },
  scanBannerText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.green,
  },
  tabBtnText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.muted,
  },
  tabBtnTextActive: {
    color: colors.green,
  },
  tabScroll: { flex: 1 },
  tabContent: { padding: 16, gap: 12 },
  tabCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statVal: { fontSize: 18, fontFamily: fonts.extraBold, color: colors.black },
  statLabel: { fontSize: 11, fontFamily: fonts.regular, color: colors.muted, marginTop: 3, textAlign: 'center' },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  sectionTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.black, marginBottom: 4 },
  ticketRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.bg },
  ticketName: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.black },
  ticketPrice: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  ticketSold: { fontSize: 14, fontFamily: fonts.bold, color: colors.green },
  ticketSoldOutBadge: { backgroundColor: colors.dangerBg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  ticketSoldOutText: { fontSize: 10, fontFamily: fonts.bold, color: '#b91c1c' },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.bg,
  },
  orderName: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.black },
  orderEmail: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  orderMeta: { fontSize: 11, fontFamily: fonts.regular, color: colors.muted, marginTop: 2 },
  orderTotal: { fontSize: 14, fontFamily: fonts.bold, color: colors.black, marginBottom: 4 },
  statusBadge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  statusOk: { backgroundColor: colors.successBg },
  statusOther: { backgroundColor: colors.bg },
  statusText: { fontSize: 11, fontFamily: fonts.semiBold },
  statusOkText: { color: colors.success },
  statusOtherText: { color: colors.muted },
  emptyText: { fontFamily: fonts.regular, color: colors.muted, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: 12,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  searchIconWrap: { width: 16, height: 16, marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  searchCircle: {
    width: 11, height: 11, borderRadius: 6,
    borderWidth: 2, borderColor: colors.muted,
    position: 'absolute', top: 0, left: 0,
  },
  searchHandle: {
    width: 2, height: 5, borderRadius: 1,
    backgroundColor: colors.muted,
    position: 'absolute', bottom: 0, right: 1,
    transform: [{ rotate: '45deg' }],
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, fontFamily: fonts.regular, color: colors.black },
  attendeeRow: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  attendeeName: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.black },
  attendeeEmail: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted, marginTop: 2 },
  attendeeMeta: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted, marginTop: 3 },
  attendeeRef: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.muted },
  checkinBadge: { backgroundColor: colors.successBg, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  checkinBadgeText: { fontSize: 10, fontFamily: fonts.bold, color: colors.success },
  checkinPartial: { backgroundColor: colors.amberBg },
  checkinPartialText: { color: colors.amber },
  btnCheckin: { borderWidth: 1.5, borderColor: colors.green, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.successBg },
  btnCheckinText: { fontSize: 11, fontFamily: fonts.bold, color: colors.green },
  btnUndo: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  btnUndoText: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.muted },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: colors.border, paddingBottom: 6, marginBottom: 2 },
  tableHead: { fontSize: 11, fontFamily: fonts.bold, color: colors.muted, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 7 },
  tableRowAlt: { backgroundColor: colors.bg },
  tableCell: { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: colors.black },
  compInfo: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted, marginBottom: 4, lineHeight: 19 },
  compCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  compCardTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.black },
  removeBtn: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.danger },
  label: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.black, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: fonts.regular, color: colors.black,
  },
  ticketPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  ticketOption: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  ticketOptionSelected: { borderColor: colors.green, backgroundColor: colors.greenDim },
  ticketOptionText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.black },
  ticketOptionSelectedText: { color: colors.green },
  addRowBtn: {
    borderWidth: 1.5, borderColor: colors.green, borderRadius: 10, borderStyle: 'dashed',
    paddingVertical: 12, alignItems: 'center',
  },
  addRowText: { color: colors.green, fontFamily: fonts.bold, fontSize: 14 },
  issueBtn: {
    backgroundColor: colors.green, borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
  },
  issueBtnDisabled: { opacity: 0.6 },
  issueBtnText: { color: colors.white, fontFamily: fonts.bold, fontSize: 15 },
  rowChevron: { fontSize: 20, color: colors.border, marginLeft: 4 },
  // modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalBox: {
    backgroundColor: colors.surface, borderRadius: 16, width: '100%',
    maxWidth: 480, overflow: 'hidden',
    shadowColor: colors.black, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 16, fontFamily: fonts.bold, color: colors.black },
  modalSub: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted, marginTop: 2 },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
  },
  modalCloseText: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.muted },
  modalLabel: { fontSize: 11, fontFamily: fonts.bold, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 16 },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: fonts.regular, color: colors.black,
  },
  modalValue: { fontSize: 16, fontFamily: fonts.bold, marginBottom: 4 },
  modalFooter: {
    flexDirection: 'row', gap: 8, padding: 16,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg,
  },
  btnResend: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 8,
    paddingVertical: 10, alignItems: 'center', backgroundColor: colors.surface,
  },
  btnResendText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.black },
  btnSave: {
    flex: 1, backgroundColor: colors.green, borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  btnSaveText: { fontSize: 13, fontFamily: fonts.bold, color: colors.white },
  msgBanner: { borderRadius: 8, padding: 10, marginTop: 12 },
  msgOk: { backgroundColor: colors.successBg },
  msgErr: { backgroundColor: colors.dangerBg },
  msgOkText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.success },
  msgErrText: { fontSize: 13, fontFamily: fonts.semiBold, color: '#991b1b' },
});
