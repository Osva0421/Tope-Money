import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Button,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import type { Session } from "@supabase/supabase-js";
import * as ImagePicker from "expo-image-picker";
import CaptureScreen from "./src/screens/CaptureScreen";
import TransactionsListScreen from "./src/screens/TransactionsListScreen";
import StatementImportScreen from "./src/screens/StatementImportScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import { recognizeText } from "./modules/ocr-scanner/src";
import { parseReceiptText } from "./src/utils/receiptParser";
import { Transaction, TransactionType } from "./src/types";
import AuthScreen from "./src/screens/AuthScreen";
import { supabase } from "./src/lib/supabase";

type Tab = "dashboard" | "capture" | "list" | "import";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  const [scannedAmount, setScannedAmount] = useState<string | undefined>();
  const [scannedMerchant, setScannedMerchant] = useState<string | undefined>();
  const [scannedDate, setScannedDate] = useState<string | undefined>();

  // Estado de edición: cuando no es undefined, CaptureScreen entra en modo edición.
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  useEffect(() => {
    async function restoreSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setSession(null);
        setAuthLoading(false);
        return;
      }

      const { error } = await supabase.auth.getUser();
      if (error) {
        await supabase.auth.signOut({ scope: "local" });
        setSession(null);
      } else {
        setSession(data.session);
      }
      setAuthLoading(false);
    }

    restoreSession().catch(() => {
      setSession(null);
      setAuthLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  function resetCaptureState() {
    setScannedAmount(undefined);
    setScannedMerchant(undefined);
    setScannedDate(undefined);
    setEditingTransaction(null);
  }

  function handleEditTransaction(transaction: Transaction) {
    setEditingTransaction(transaction);
    setScannedAmount(String(transaction.amount));
    setScannedMerchant(transaction.merchant);
    setScannedDate(transaction.date.slice(0, 10));
    setTab("capture");
  }

  async function processReceiptImage(photoUri: string) {
    try {
      const lines = await recognizeText(photoUri);
      const parsed = parseReceiptText(lines);

      if (!parsed.merchant && parsed.amount === null) {
        Alert.alert(
          "No se detectó nada útil",
          "Intenta con una foto más clara, o llena el formulario manualmente.",
        );
        return;
      }

      resetCaptureState();
      setScannedAmount(
        parsed.amount !== null ? String(parsed.amount) : undefined,
      );
      setScannedMerchant(parsed.merchant ?? undefined);
      setScannedDate(parsed.date ?? undefined);
      setTab("capture");
    } catch (err: any) {
      Alert.alert("Error al leer el ticket", err.message);
    }
  }

  async function scanWithCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Falta permiso",
        "Necesitas darle permiso de cámara a la app.",
      );
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
      Alert.alert(
        "Falta permiso",
        "Necesitas darle permiso de fotos a la app.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled) return;
    await processReceiptImage(result.assets[0].uri);
  }

  if (authLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!session) return <AuthScreen />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Tope Money</Text>
        <Pressable onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOut}>Salir</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "dashboard" && styles.tabActive]}
          onPress={() => setTab("dashboard")}
        >
          <Text
            style={tab === "dashboard" ? styles.tabTextActive : styles.tabText}
          >
            Inicio
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "capture" && styles.tabActive]}
          onPress={() => {
            resetCaptureState();
            setTab("capture");
          }}
        >
          <Text
            style={tab === "capture" ? styles.tabTextActive : styles.tabText}
          >
            Captura
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "import" && styles.tabActive]}
          onPress={() => setTab("import")}
        >
          <Text
            style={tab === "import" ? styles.tabTextActive : styles.tabText}
          >
            Importar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "list" && styles.tabActive]}
          onPress={() => setTab("list")}
        >
          <Text style={tab === "list" ? styles.tabTextActive : styles.tabText}>
            Movimientos
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "capture" && !editingTransaction && (
        <View style={styles.scanButtons}>
          <Button title="📷 Escanear con cámara" onPress={scanWithCamera} />
          <View style={{ height: 8 }} />
          <Button
            title="🖼️ Elegir ticket de galería"
            onPress={pickFromGallery}
          />
        </View>
      )}

      {tab === "dashboard" ? (
        <DashboardScreen refreshKey={refreshKey} />
      ) : tab === "capture" ? (
        <CaptureScreen
          initialAmount={scannedAmount}
          initialMerchant={scannedMerchant}
          initialDate={scannedDate}
          editingTransactionId={editingTransaction?.id}
          initialType={editingTransaction?.type as TransactionType | undefined}
          initialIsPlanned={editingTransaction?.isPlanned}
          initialCategoryId={editingTransaction?.categoryId ?? undefined}
          onSaved={() => {
            setRefreshKey((k) => k + 1);
            resetCaptureState();
            setTab("list");
          }}
        />
      ) : tab === "list" ? (
        <TransactionsListScreen
          refreshKey={refreshKey}
          onEditTransaction={handleEditTransaction}
        />
      ) : (
        <StatementImportScreen
          onImported={() => setRefreshKey((key) => key + 1)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 8,
  },
  title: { fontSize: 20, fontWeight: "700" },
  signOut: { color: "#555", fontWeight: "600", padding: 8 },
  tabs: { flexDirection: "row", margin: 16, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  tabActive: { backgroundColor: "#111", borderColor: "#111" },
  tabText: { color: "#111", fontWeight: "600" },
  tabTextActive: { color: "#fff", fontWeight: "600" },
  scanButtons: { marginHorizontal: 16, marginBottom: 8 },
});
