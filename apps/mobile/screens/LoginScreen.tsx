import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api, setToken } from "../lib/api";
import { colors } from "../theme";

export function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState("aluno@biofit.dev");
  const [senha, setSenha] = useState("senha123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ token: string; user: { role: string } }>("/auth/login", {
        method: "POST",
        body: { email, senha },
      });
      if (res.user.role !== "ALUNO") {
        throw new Error("Este app é exclusivo para alunos");
      }
      await setToken(res.token);
      onLoggedIn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>B</Text>
      </View>
      <Text style={styles.title}>BioFIT</Text>
      <Text style={styles.subtitle}>App do aluno</Text>

      <View style={styles.card}>
        <Text style={styles.label}>E-mail</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          placeholderTextColor={colors.inkFaint}
        />
        <Text style={styles.label}>Senha</Text>
        <TextInput
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          style={styles.input}
          placeholderTextColor={colors.inkFaint}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
        </Pressable>
      </View>
      <Text style={styles.demo}>Demo: aluno@biofit.dev / senha123</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: 24 },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  logoText: { fontSize: 22, fontWeight: "900", color: "#0a0b0f" },
  title: { color: colors.ink, fontSize: 22, fontWeight: "700" },
  subtitle: { color: colors.inkMuted, fontSize: 13, marginBottom: 24 },
  card: { width: "100%", maxWidth: 360, backgroundColor: colors.card, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: colors.line },
  label: { color: colors.inkMuted, fontSize: 12, marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 10,
    color: colors.ink,
  },
  error: { color: colors.danger, fontSize: 13, marginTop: 10 },
  button: {
    backgroundColor: colors.brand,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 18,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  demo: { color: colors.inkFaint, fontSize: 12, marginTop: 16 },
});
