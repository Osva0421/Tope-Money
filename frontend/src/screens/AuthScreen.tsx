import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function AuthScreen() {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 6) {
      Alert.alert(
        "Revisa tus datos",
        "Escribe un correo válido y una contraseña de al menos 6 caracteres.",
      );
      return;
    }

    setLoading(true);
    try {
      if (mode === "signIn") {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { name: name.trim() || undefined } },
        });
        if (error) throw error;
        if (!data.session) {
          Alert.alert(
            "Confirma tu correo",
            "Supabase envió un enlace a tu correo. Ábrelo y después inicia sesión.",
          );
          setMode("signIn");
        }
      }
    } catch (error) {
      Alert.alert(
        "No se pudo continuar",
        error instanceof Error ? error.message : "Inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.brand}>Tope Money</Text>
        <Text style={styles.subtitle}>
          {mode === "signIn"
            ? "Inicia sesión para ver tus finanzas"
            : "Crea tu cuenta personal"}
        </Text>

        {mode === "signUp" && (
          <TextInput
            autoCapitalize="words"
            placeholder="Nombre (opcional)"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
        )}
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="Correo"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          autoCapitalize="none"
          autoComplete={mode === "signIn" ? "current-password" : "new-password"}
          placeholder="Contraseña"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
        />

        <Pressable
          disabled={loading}
          onPress={submit}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || loading) && styles.buttonPressed,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>
              {mode === "signIn" ? "Entrar" : "Crear cuenta"}
            </Text>
          )}
        </Pressable>

        <Pressable
          disabled={loading}
          onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
        >
          <Text style={styles.switchText}>
            {mode === "signIn"
              ? "¿No tienes cuenta? Crear una"
              : "Ya tengo una cuenta"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f5f5f3",
  },
  card: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: "#fff",
    gap: 14,
  },
  brand: { fontSize: 30, fontWeight: "800", color: "#111" },
  subtitle: { color: "#666", fontSize: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#d5d5d5",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  primaryButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#111",
  },
  buttonPressed: { opacity: 0.7 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  switchText: {
    textAlign: "center",
    color: "#333",
    fontWeight: "600",
    paddingVertical: 8,
  },
});
