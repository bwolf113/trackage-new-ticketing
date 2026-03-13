import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput, RefreshControl, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../lib/AuthContext';
import { getOrganiserEvents, EventSummary } from '../../../lib/api';

const GREEN = '#0a9e7f';

function fmtDate(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EventsScreen() {
  const { organiser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  async function load(showRefresh = false) {
    if (!organiser) { setLoading(false); return; }
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await getOrganiserEvents(organiser.id);
      setEvents(data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { if (!authLoading) load(); }, [organiser?.id, authLoading]);

  const filtered = events.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.name?.toLowerCase().includes(q) || e.venue_name?.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {events.length > 0 && (
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search events…"
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={e => e.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={GREEN} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎫</Text>
            <Text style={styles.emptyTitle}>{search ? 'No events match your search' : 'No events yet'}</Text>
            <Text style={styles.emptySub}>{search ? 'Try a different search term.' : 'Create events in the organiser dashboard.'}</Text>
          </View>
        }
        renderItem={({ item: ev }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => router.push({ pathname: '/(app)/events/[id]', params: { id: ev.id } })}
          >
            <View style={styles.thumb}>
              {ev.thumbnail_url
                ? <Image source={{ uri: ev.thumbnail_url }} style={styles.thumbImg} />
                : <Text style={styles.thumbEmoji}>🎫</Text>
              }
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{ev.name}</Text>
              <Text style={styles.meta}>{fmtDate(ev.start_time)}</Text>
              {ev.venue_name ? <Text style={styles.meta}>{ev.venue_name}</Text> : null}
              <Text style={styles.meta}>{ev.completed_orders ?? 0} order{ev.completed_orders !== 1 ? 's' : ''}</Text>
            </View>
            <View style={[styles.badge, ev.status === 'published' ? styles.badgePub : styles.badgeDraft]}>
              <Text style={[styles.badgeText, ev.status === 'published' ? styles.badgePubText : styles.badgeDraftText]}>
                {ev.status}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: '#111827' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  thumbImg: { width: 52, height: 52, borderRadius: 8 },
  thumbEmoji: { fontSize: 22 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 3 },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgePub: { backgroundColor: '#d1fae5' },
  badgeDraft: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgePubText: { color: '#065f46' },
  badgeDraftText: { color: '#6b7280' },
  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
});
