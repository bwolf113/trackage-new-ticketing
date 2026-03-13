import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Vibration, ScrollView, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { checkInTicket, ScanResult } from '../../../../lib/api';
import { useAuth } from '../../../../lib/AuthContext';

const GREEN   = '#0a9e7f';
const RED     = '#ef4444';
const AMBER   = '#f59e0b';

type ScanState = 'idle' | 'scanning' | 'result';

function fmtTime(dt: string | null) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('en-MT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function extractToken(raw: string): string {
  // QR codes contain either a full URL (https://site.com/scan/{token}) or just the token
  const match = raw.match(/\/scan\/([a-zA-Z0-9-]+)\/?$/);
  if (match) return match[1];
  // Could also be a raw UUID or order id
  return raw.trim();
}

export default function ScanScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBarcode = useCallback(async ({ data }: { data: string }) => {
    if (processingRef.current || scanState === 'result') return;
    processingRef.current = true;
    setScanState('scanning');

    const token = extractToken(data);
    if (!token) {
      processingRef.current = false;
      return;
    }

    try {
      const accessToken = session?.access_token || '';
      const res = await checkInTicket(token, accessToken);
      setResult(res);
      setError(null);

      if (res.status === 'ok') {
        Vibration.vibrate(Platform.OS === 'android' ? 100 : [0, 100]);
      } else {
        Vibration.vibrate(Platform.OS === 'android' ? [0, 100, 50, 100] : [0, 100, 50, 100]);
      }
    } catch (e: any) {
      setError('Network error. Please try again.');
      setResult(null);
    } finally {
      setScanState('result');
    }
  }, [scanState]);

  function reset() {
    setResult(null);
    setError(null);
    processingRef.current = false;
    setScanState('scanning');
  }

  // Permission not yet determined
  if (!permission) {
    return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>;
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permIcon}>📷</Text>
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permSub}>Trackage needs camera access to scan ticket QR codes.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant camera access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Camera */}
      {scanState !== 'result' && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanState === 'scanning' ? handleBarcode : undefined}
        />
      )}

      {/* Overlay + viewfinder when scanning */}
      {scanState === 'scanning' && (
        <View style={styles.overlay}>
          <View style={styles.topOverlay} />
          <View style={styles.middleRow}>
            <View style={styles.sideOverlay} />
            <View style={styles.viewfinder}>
              {/* Corner brackets */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.sideOverlay} />
          </View>
          <View style={styles.bottomOverlay}>
            <Text style={styles.scanHint}>Point the camera at a ticket QR code</Text>
          </View>
        </View>
      )}

      {/* Processing spinner (between scan and result) */}
      {scanState === 'scanning' && processingRef.current && (
        <View style={[StyleSheet.absoluteFillObject, styles.processingOverlay]}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>Checking in…</Text>
        </View>
      )}

      {/* Result card */}
      {scanState === 'result' && (
        <View style={{ flex: 1, backgroundColor: result?.status === 'ok' ? GREEN : (result?.status === 'already_used' ? AMBER : RED) }}>
          <ScrollView contentContainerStyle={styles.resultScroll}>
            {/* Status icon + message */}
            <View style={styles.resultIconWrap}>
              <Text style={styles.resultIcon}>
                {result?.status === 'ok'           ? '✅' :
                 result?.status === 'already_used' ? '⚠️' :
                 result?.status === 'not_found'    ? '❓' :
                 result?.status === 'cancelled'    ? '🚫' : '❌'}
              </Text>
              <Text style={styles.resultTitle}>
                {result?.status === 'ok'           ? 'Valid Ticket' :
                 result?.status === 'already_used' ? 'Already Scanned' :
                 result?.status === 'not_found'    ? 'Ticket Not Found' :
                 result?.status === 'cancelled'    ? 'Cancelled Ticket' :
                 error                             ? 'Error' : 'Invalid'}
              </Text>
              <Text style={styles.resultSubtitle}>
                {result?.status === 'ok'           ? 'Entry granted' :
                 result?.status === 'already_used' ? `Scanned at ${fmtTime(result.checked_in_at)}` :
                 result?.status === 'not_found'    ? 'No ticket found for this QR code' :
                 result?.status === 'cancelled'    ? 'This ticket has been cancelled' :
                 error || ''}
              </Text>
            </View>

            {/* Ticket details */}
            {result?.order && (
              <View style={styles.detailCard}>
                <Text style={styles.detailName}>{result.order.customer_name || '—'}</Text>
                <Text style={styles.detailEvent}>{result.order.event_name || ''}</Text>
                <Text style={styles.detailRef}>Order #{result.order.ref}</Text>

                {(result.order.tickets || []).length > 0 && (
                  <View style={styles.ticketList}>
                    {result.order.tickets.map((t, i) => (
                      <View key={i} style={styles.ticketItem}>
                        <Text style={styles.ticketItemName}>{t.ticket_name}</Text>
                        <Text style={styles.ticketItemQty}>× {t.quantity}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Scan next button */}
            <TouchableOpacity style={styles.scanNextBtn} onPress={reset} activeOpacity={0.85}>
              <Text style={styles.scanNextText}>Scan next ticket</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const VIEWFINDER_SIZE = 240;
const CORNER_SIZE = 28;
const CORNER_THICK = 3;

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#fff' },
  permIcon: { fontSize: 48, marginBottom: 16 },
  permTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  permSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  permBtn: { backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 13 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Scanner overlay
  overlay: { ...StyleSheet.absoluteFillObject },
  topOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  middleRow: { flexDirection: 'row', height: VIEWFINDER_SIZE },
  sideOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  viewfinder: { width: VIEWFINDER_SIZE, height: VIEWFINDER_SIZE },
  bottomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', paddingTop: 24 },
  scanHint: { color: '#fff', fontSize: 14, fontWeight: '500' },

  // Corners
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: '#fff' },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderBottomRightRadius: 4 },

  processingOverlay: { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  processingText: { color: '#fff', marginTop: 12, fontSize: 16, fontWeight: '600' },

  // Result
  resultScroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 48 },
  resultIconWrap: { alignItems: 'center', marginBottom: 32 },
  resultIcon: { fontSize: 72, marginBottom: 16 },
  resultTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 },
  resultSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  detailCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  detailName: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  detailEvent: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  detailRef: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 12 },
  ticketList: { gap: 8 },
  ticketItem: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 8 },
  ticketItemName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  ticketItemQty: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  scanNextBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  scanNextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
