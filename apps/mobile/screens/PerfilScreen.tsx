import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api, clearToken } from "../lib/api";
import { colors } from "../theme";

interface Me {
  nome: string;
  email: string;
  objetivo: string | null;
}

const OBJETIVO_LABEL: Record<string, string> = {
  EMAGRECIMENTO: "Emagrecimento",
  HIPERTROFIA: "Hipertrofia",
  FORCA: "Força",
  RECUPERACAO_POS_LESAO: "Recuperação pós-lesão",
};

export function PerfilScreen({ onLogout }: { onLogout: () => void }) {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api<Me>("/me").then(setMe);
  }, []);

  async function handleLogout() {
    await clearToken();
    onLogout();
  }

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <Text style={styles.brand}>Perfil</Text>
      </View>

      {!me && <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} />}

      {me && (
        <View style={{ padding: 16 }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{me.nome.slice(0, 2).toUpperCase()}</Text>
          </View>
          <Text style={styles.nome}>{me.nome}</Text>
          <Text style={styles.email}>{me.email}</Text>
          {me.objetivo && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Objetivo: {OBJETIVO_LABEL[me.objetivo] ?? me.objetivo}</Text>
            </View>
          )}
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sair da conta</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  brand: { color: colors.ink, fontWeight: "700", fontSize: 16 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { color: "#0a0b0f", fontWeight: "800", fontSize: 18 },
  nome: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  email: { color: colors.inkMuted, fontSize: 13, marginTop: 2 },
  badge: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: colors.inkMuted, fontSize: 12 },
  logoutButton: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutText: { color: colors.danger, fontWeight: "600" },
});
