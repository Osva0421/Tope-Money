import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { importStatementCsv } from "../api/client";
import { StatementImport } from "../types";

export default function StatementImportScreen({
  onImported,
}: {
  onImported: () => void;
}) {
  const [sourceName, setSourceName] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<StatementImport | null>(null);

  async function selectAndImport() {
    if (!sourceName.trim()) {
      Alert.alert(
        "Falta el banco",
        "Escribe el banco o la fuente del estado de cuenta.",
      );
      return;
    }

    const picked = await DocumentPicker.getDocumentAsync({
      type: [
        "text/csv",
        "text/comma-separated-values",
        "text/plain",
        "application/vnd.ms-excel",
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled) return;

    const asset = picked.assets[0];
    if (asset.size && asset.size > 5_000_000) {
      Alert.alert(
        "Archivo demasiado grande",
        "El CSV debe pesar menos de 5 MB.",
      );
      return;
    }

    setSelectedName(asset.name);
    setImporting(true);
    setResult(null);
    try {
      const csv = await new File(asset.uri).text();
      const imported = await importStatementCsv({
        sourceName: sourceName.trim(),
        fileName: asset.name,
        csv,
      });
      setResult(imported);
      onImported();
    } catch (error) {
      Alert.alert(
        "No se pudo importar",
        error instanceof Error
          ? error.message
          : "Ocurrió un error desconocido.",
      );
    } finally {
      setImporting(false);
    }
  }

  const errorEntries =
    result?.entries.filter((entry) => entry.status === "ERROR") ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Importar estado de cuenta</Text>
      <Text style={styles.description}>
        Selecciona un CSV. Tope Money conciliará movimientos por monto, fecha y
        comercio antes de crear los faltantes.
      </Text>

      <Text style={styles.label}>Banco o fuente</Text>
      <TextInput
        style={styles.input}
        value={sourceName}
        onChangeText={setSourceName}
        placeholder="Ej. BBVA, Santander, cuenta de negocio"
        editable={!importing}
      />

      <TouchableOpacity
        style={[styles.button, importing && styles.buttonDisabled]}
        onPress={selectAndImport}
        disabled={importing}
      >
        {importing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Seleccionar CSV</Text>
        )}
      </TouchableOpacity>

      {selectedName && (
        <Text style={styles.fileName}>Archivo: {selectedName}</Text>
      )}

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Resultado</Text>
          <Summary label="Movimientos leídos" value={result.rowCount} />
          <Summary label="Nuevos" value={result.createdCount} />
          <Summary label="Ya registrados" value={result.matchedCount} />
          <Summary label="Duplicados" value={result.duplicateCount} />
          <Summary label="Con error" value={result.errorCount} />

          {errorEntries.slice(0, 5).map((entry) => (
            <Text key={entry.id} style={styles.errorText}>
              Fila {entry.rowNumber}: {entry.errorMessage}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 20, fontWeight: "700" },
  description: { color: "#666", lineHeight: 20, marginTop: 8 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 20, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  button: {
    marginTop: 16,
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  fileName: { color: "#666", marginTop: 10 },
  resultCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  resultTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  summaryLabel: { color: "#555" },
  summaryValue: { fontWeight: "700" },
  errorText: { color: "#b42318", marginTop: 8 },
});
