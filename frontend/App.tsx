import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Button,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import CaptureScreen from './src/screens/CaptureScreen';
import TransactionsListScreen from './src/screens/TransactionsListScreen';
import { recognizeText } from './modules/ocr-scanner/src';
import { parseReceiptText } from './src/utils/receiptParser';
import { Transaction, TransactionType } from './src/types';

type Tab = 'capture' | 'list';

export default function App() {
  const [tab, setTab] = useState<Tab>('capture');
  const [refreshKey, setRefreshKey] = useState(0);

  const [scannedAmount, setScannedAmount] = useState<string | undefined>();
  const [scannedMerchant, setScannedMerchant] = useState<string | undefined>();

  // Estado de edición: cuando no es undefined, CaptureScreen entra en modo edición.
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(
    null,
  );

  function resetCaptureState() {
    setScannedAmount(undefined);
    setScannedMerchant(undefined);
    setEditingTransaction(null);
  }

  function handleEditTransaction(transaction: Transaction) {
    setEditingTransaction(transaction);
    setScannedAmount(String(transaction.amount));
    setScannedMerchant(transaction.merchant);
    setTab('capture');
  }

  async function processReceiptImage(photoUri: string) {
    try {
      const lines = await recognizeText(photoUri);
      const parsed = parseReceiptText(lines);

      if (!parsed.merchant && parsed.amount === null) {
        Alert.alert(
          'No se detectó nada útil',
          'Intenta con una foto más clara, o llena el formulario manualmente.',
        );
        return;
      }

      resetCaptureState();
      setScannedAmount(parsed.amount !== null ? String(parsed.amount) : undefined);
      setScannedMerchant(parsed.merchant ?? undefined);
      setTab('capture');
    } catch (err: any) {
      Alert.alert('Error al leer el ticket', err.message);
    }
  }

  async function scanWithCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Falta permiso', 'Necesitas darle permiso de cámara a la app.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled) return;
    await processReceiptImage(result.assets[0].uri);
  }

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Falta permiso', 'Necesitas darle permiso de fotos a la app.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled) return;
    await processReceiptImage(result.assets[0].uri);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.title}>Tope Money</Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'capture' && styles.tabActive]}
          onPress={() => {
            resetCaptureState();
            setTab('capture');
          }}
        >
          <Text style={tab === 'capture' ? styles.tabTextActive : styles.tabText}>
            Capturar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'list' && styles.tabActive]}
          onPress={() => setTab('list')}
        >
          <Text style={tab === 'list' ? styles.tabTextActive : styles.tabText}>
            Transacciones
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'capture' && !editingTransaction && (
        <View style={styles.scanButtons}>
          <Button title="📷 Escanear con cámara" onPress={scanWithCamera} />
          <View style={{ height: 8 }} />
          <Button title="🖼️ Elegir ticket de galería" onPress={pickFromGallery} />
        </View>
      )}

      {tab === 'capture' ? (
        <CaptureScreen
          initialAmount={scannedAmount}
          initialMerchant={scannedMerchant}
          editingTransactionId={editingTransaction?.id}
          initialType={editingTransaction?.type as TransactionType | undefined}
          initialIsPlanned={editingTransaction?.isPlanned}
          initialCategoryId={editingTransaction?.categoryId ?? undefined}
          onSaved={() => {
            setRefreshKey((k) => k + 1);
            resetCaptureState();
            setTab('list');
          }}
        />
      ) : (
        <TransactionsListScreen
          refreshKey={refreshKey}
          onEditTransaction={handleEditTransaction}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  tabs: { flexDirection: 'row', margin: 16, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  tabActive: { backgroundColor: '#111', borderColor: '#111' },
  tabText: { color: '#111', fontWeight: '600' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  scanButtons: { marginHorizontal: 16, marginBottom: 8 },
});
