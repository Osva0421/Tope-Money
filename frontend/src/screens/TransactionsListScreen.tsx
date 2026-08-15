import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { getCategories, getTransactions } from '../api/client';
import { Category, Transaction } from '../types';

export interface TransactionsListScreenHandle {
  refresh: () => void;
}

export default function TransactionsListScreen({
  refreshKey,
}: {
  refreshKey: number;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [txs, cats] = await Promise.all([
        getTransactions(),
        getCategories(),
      ]);
      // Más recientes primero
      txs.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setTransactions(txs);
      setCategories(cats);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  function categoryLabel(categoryId: string | null) {
    if (!categoryId) return 'Sin categoría';
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return 'Sin categoría';
    return cat.icon ? `${cat.icon} ${cat.name}` : cat.name;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={transactions}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            Aún no hay transacciones. Agrega una en la otra pestaña.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.merchant}>{item.merchant}</Text>
            <Text style={styles.meta}>
              {categoryLabel(item.categoryId)} ·{' '}
              {item.isPlanned ? 'Previsto' : 'Imprevisto'}
            </Text>
          </View>
          <Text
            style={[
              styles.amount,
              item.type === 'income' ? styles.income : styles.expense,
            ]}
          >
            {item.type === 'income' ? '+' : '-'}${item.amount.toFixed(2)}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: '#888', textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  merchant: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, color: '#888', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '700' },
  income: { color: '#1a7f37' },
  expense: { color: '#c0392b' },
});
