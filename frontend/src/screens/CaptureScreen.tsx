import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { getCategories, createTransaction } from '../api/client';
import { Category, TransactionType } from '../types';

interface Props {
  onSaved: () => void;
  initialAmount?: string;
  initialMerchant?: string;
}

export default function CaptureScreen({
  onSaved,
  initialAmount,
  initialMerchant,
}: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [amount, setAmount] = useState(initialAmount ?? '');
  const [merchant, setMerchant] = useState(initialMerchant ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [type, setType] = useState<TransactionType>('expense');
  const [isPlanned, setIsPlanned] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => Alert.alert('Error cargando categorías', err.message));
  }, []);

  // Si llega un ticket nuevo desde el OCR mientras esta pantalla ya está
  // abierta, actualiza el formulario con los valores detectados.
  useEffect(() => {
    if (initialAmount !== undefined) setAmount(initialAmount);
  }, [initialAmount]);

  useEffect(() => {
    if (initialMerchant !== undefined) setMerchant(initialMerchant);
  }, [initialMerchant]);

  // Agrupa categorías raíz (sin padre) con su lista de subcategorías,
  // igual que en el árbol Usuario -> Categoría -> Subcategoría.
  const groupedCategories = useMemo(() => {
    const roots = categories.filter((c) => !c.parentId);
    return roots.map((root) => ({
      root,
      children: categories.filter((c) => c.parentId === root.id),
    }));
  }, [categories]);

  async function handleSave() {
    const numericAmount = Number(amount.replace(',', '.'));

    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Revisa el monto', 'El monto debe ser un número mayor a 0.');
      return;
    }
    if (!merchant.trim()) {
      Alert.alert('Falta el comercio', 'Escribe dónde fue el gasto/ingreso.');
      return;
    }

    setSaving(true);
    try {
      await createTransaction({
        amount: numericAmount,
        merchant: merchant.trim(),
        categoryId,
        type,
        isPlanned,
      });
      setAmount('');
      setMerchant('');
      setCategoryId(null);
      setType('expense');
      setIsPlanned(true);
      onSaved();
    } catch (err: any) {
      Alert.alert('Error al guardar', err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Monto</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="0.00"
        value={amount}
        onChangeText={setAmount}
      />

      <Text style={styles.label}>Comercio</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej. OXXO, Renta, Sueldo..."
        value={merchant}
        onChangeText={setMerchant}
      />

      <Text style={styles.label}>Tipo</Text>
      <View style={styles.row}>
        <ToggleButton
          label="Gasto"
          active={type === 'expense'}
          onPress={() => setType('expense')}
        />
        <ToggleButton
          label="Ingreso"
          active={type === 'income'}
          onPress={() => setType('income')}
        />
      </View>

      <Text style={styles.label}>¿Previsto o imprevisto?</Text>
      <View style={styles.row}>
        <ToggleButton
          label="Previsto"
          active={isPlanned}
          onPress={() => setIsPlanned(true)}
        />
        <ToggleButton
          label="Imprevisto"
          active={!isPlanned}
          onPress={() => setIsPlanned(false)}
        />
      </View>

      <Text style={styles.label}>Categoría</Text>
      {groupedCategories.map(({ root, children }) => (
        <View key={root.id} style={styles.categoryGroup}>
          <ToggleButton
            label={`${root.icon ?? '📁'} ${root.name}`}
            active={categoryId === root.id}
            onPress={() => setCategoryId(root.id)}
          />
          {children.length > 0 && (
            <View style={styles.subcategoryWrap}>
              {children.map((child) => (
                <ToggleButton
                  key={child.id}
                  label={`${child.icon ?? '·'} ${child.name}`}
                  active={categoryId === child.id}
                  onPress={() => setCategoryId(child.id)}
                  small
                />
              ))}
            </View>
          )}
        </View>
      ))}
      {categories.length === 0 && (
        <Text style={styles.hint}>
          No se encontraron categorías. Revisa que existan categorías en
          /categories y que el backend esté corriendo en el puerto 3000.
        </Text>
      )}

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ToggleButton({
  label,
  active,
  onPress,
  small,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  small?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.toggle, small && styles.toggleSmall, active && styles.toggleActive]}
      onPress={onPress}
    >
      <Text style={active ? styles.toggleTextActive : styles.toggleText}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  row: { flexDirection: 'row', gap: 8 },
  categoryGroup: { marginBottom: 10 },
  subcategoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginLeft: 16,
  },
  hint: { fontSize: 12, color: '#888', marginTop: 8 },
  toggle: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    alignSelf: 'flex-start',
  },
  toggleSmall: { paddingVertical: 6, paddingHorizontal: 10 },
  toggleActive: { backgroundColor: '#111', borderColor: '#111' },
  toggleText: { color: '#111' },
  toggleTextActive: { color: '#fff' },
  saveButton: {
    marginTop: 24,
    marginBottom: 40,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

