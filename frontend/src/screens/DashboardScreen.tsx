import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getFinancialInsights, simulateFinancialScenario } from "../api/client";
import { FinancialInsights, FinancialSimulation } from "../types";

function money(value: number): string {
  return `$${value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardScreen({
  refreshKey,
}: {
  refreshKey: number;
}) {
  const [insights, setInsights] = useState<FinancialInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [frequency, setFrequency] = useState<"ONE_TIME" | "MONTHLY">(
    "ONE_TIME",
  );
  const [simulating, setSimulating] = useState(false);
  const [simulation, setSimulation] = useState<FinancialSimulation | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      setInsights(await getFinancialInsights());
    } catch (error) {
      Alert.alert(
        "No se pudo cargar el análisis",
        error instanceof Error ? error.message : "Error desconocido",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function runSimulation() {
    const numericAmount = Number(amount.replace(",", "."));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert("Revisa el monto", "Escribe un monto mayor a cero.");
      return;
    }
    setSimulating(true);
    try {
      setSimulation(
        await simulateFinancialScenario({
          amount: numericAmount,
          direction,
          frequency,
        }),
      );
    } catch (error) {
      Alert.alert(
        "No se pudo simular",
        error instanceof Error ? error.message : "Error desconocido",
      );
    } finally {
      setSimulating(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <Text style={styles.heading}>Últimos 30 días</Text>
      <View style={styles.metricGrid}>
        <Metric
          label="Ingresos"
          value={money(insights?.totals.income ?? 0)}
          positive
        />
        <Metric label="Gastos" value={money(insights?.totals.expenses ?? 0)} />
        <Metric
          label="Flujo libre"
          value={money(insights?.totals.netCashFlow ?? 0)}
          positive={(insights?.totals.netCashFlow ?? 0) >= 0}
        />
        <Metric
          label="Tasa de ahorro"
          value={
            insights?.totals.savingsRatePercent === null
              ? "Sin datos"
              : `${insights?.totals.savingsRatePercent ?? 0}%`
          }
          positive={(insights?.totals.savingsRatePercent ?? 0) >= 0}
        />
      </View>

      {insights?.messages.map((message) => (
        <View key={message} style={styles.messageCard}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ))}

      {(insights?.smallRecurringExpenses.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gastos pequeños repetidos</Text>
          {insights?.smallRecurringExpenses.slice(0, 3).map((item) => (
            <Text
              key={`${item.merchant}-${item.category}`}
              style={styles.rowText}
            >
              {item.merchant}: {item.count} compras · {money(item.total)}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Simular un cambio</Text>
        <Text style={styles.hint}>
          Prueba una compra, un gasto mensual o un ingreso adicional sin
          modificar tus datos.
        </Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="Monto"
        />
        <View style={styles.choiceRow}>
          <Choice
            label="Gasto"
            active={direction === "EXPENSE"}
            onPress={() => setDirection("EXPENSE")}
          />
          <Choice
            label="Ingreso"
            active={direction === "INCOME"}
            onPress={() => setDirection("INCOME")}
          />
        </View>
        <View style={styles.choiceRow}>
          <Choice
            label="Una vez"
            active={frequency === "ONE_TIME"}
            onPress={() => setFrequency("ONE_TIME")}
          />
          <Choice
            label="Cada mes"
            active={frequency === "MONTHLY"}
            onPress={() => setFrequency("MONTHLY")}
          />
        </View>
        <TouchableOpacity
          style={styles.simulateButton}
          onPress={runSimulation}
          disabled={simulating}
        >
          {simulating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.simulateText}>Simular</Text>
          )}
        </TouchableOpacity>

        {simulation && (
          <View style={styles.simulationResult}>
            <Text style={styles.resultTitle}>
              Resultado: {simulation.result.riskLevel}
            </Text>
            <Text>
              Saldo rastreado: {money(simulation.result.trackedBalance)}
            </Text>
            <Text>
              Flujo libre mensual: {money(simulation.result.monthlyFreeCash)}
            </Text>
            {simulation.result.warnings.map((warning) => (
              <Text key={warning} style={styles.warning}>
                {warning}
              </Text>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Metric({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, positive && styles.positive]}>
        {value}
      </Text>
    </View>
  );
}

function Choice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.choice, active && styles.choiceActive]}
      onPress={onPress}
    >
      <Text style={active ? styles.choiceTextActive : styles.choiceText}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
  },
  metricLabel: { color: "#666", fontSize: 12 },
  metricValue: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 4,
    color: "#b42318",
  },
  positive: { color: "#067647" },
  messageCard: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  messageText: { lineHeight: 19 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  rowText: { marginTop: 8, color: "#444" },
  hint: { color: "#666", lineHeight: 19, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginTop: 12,
  },
  choiceRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: "center",
  },
  choiceActive: { backgroundColor: "#111", borderColor: "#111" },
  choiceText: { color: "#111" },
  choiceTextActive: { color: "#fff", fontWeight: "600" },
  simulateButton: {
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 14,
  },
  simulateText: { color: "#fff", fontWeight: "700" },
  simulationResult: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 5,
  },
  resultTitle: { fontWeight: "700" },
  warning: { color: "#b42318", marginTop: 4 },
});
