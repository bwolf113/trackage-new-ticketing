import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput, RefreshControl, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../lib/AuthContext';
import { getOrganiserEvents, EventSummary } from '../../../lib/api';
import { colors, fonts } from '../../../lib/theme';

function fmtDate(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EventsScreen() {
  const { organiser, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  async function load(showRefresh = false) {
    if (!organiser || !session) { setLoading(false); return; }
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await getOrganiserEvents(session.access_token);
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
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search events…"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/(app)/events/new')}
        >
          <Text style={styles.createBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={e => e.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.green} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎫</Text>
            <Text style={styles.emptyTitle}>{search ? 'No events match your search' : 'No events yet'}</Text>
            <Text style={styles.emptySub}>{search ? 'Try a different search term.' : 'Tap "+ New" above to create your first event.'}</Text>
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
            <View style={[
              styles.badge,
              ev.status === 'published' ? styles.badgePub :
              ev.status === 'sold_out'  ? styles.badgeSoldOut :
              styles.badgeDraft,
            ]}>
              <Text style={[
                styles.badgeText,
                ev.status === 'published' ? styles.badgePubText :
                ev.status === 'sold_out'  ? styles.badgeSoldOutText :
                styles.badgeDraftText,
              ]}>
                {ev.status === 'sold_out' ? 'Sold Out' : ev.status}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 0,
    gap: 10,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, fontFamily: fonts.regular, color: colors.black },
  createBtn: {
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  createBtnText: { fontSize: 14, fontFamily: fonts.bold, color: colors.white },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  thumbImg: { width: 52, height: 52, borderRadius: 8 },
  thumbEmoji: { fontSize: 22 },
  info: { flex: 1 },
  name: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.black, marginBottom: 3 },
  meta: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted, marginTop: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgePub: { backgroundColor: colors.successBg },
  badgeDraft: { backgroundColor: colors.bg },
  badgeSoldOut: { backgroundColor: colors.dangerBg },
  badgeText: { fontSize: 11, fontFamily: fonts.bold },
  badgePubText: { color: colors.success },
  badgeDraftText: { color: colors.muted },
  badgeSoldOutText: { color: '#b91c1c' },
  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.black, marginBottom: 6 },
  emptySub: { fontSize: 14, fontFamily: fonts.regular, color: colors.muted, textAlign: 'center' },
});
