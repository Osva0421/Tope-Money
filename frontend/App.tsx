import React, { useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import CaptureScreen from './src/screens/CaptureScreen';
import TransactionsListScreen from './src/screens/TransactionsListScreen';

type Tab = 'capture' | 'list';

export default function App() {
  const [tab, setTab] = useState<Tab>('capture');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.title}>Tope Money</Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'capture' && styles.tabActive]}
          onPress={() => setTab('capture')}
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

      {tab === 'capture' ? (
        <CaptureScreen
          onSaved={() => {
            setRefreshKey((k) => k + 1);
            setTab('list');
          }}
        />
      ) : (
        <TransactionsListScreen refreshKey={refreshKey} />
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
});
