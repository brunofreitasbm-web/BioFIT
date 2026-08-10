import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { colors } from "../theme";

interface Cobranca {
  id: string;
  valorCentavos: number;
  status: "PENDENTE" | "PAGO" | "VENCIDO";
  descricao: string | null;
  pixQrCodeBase64: string | null;
  pixCopiaCola: string | null;
}

const STATUS_LABEL: Record<Cobranca["status"], string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  VENCIDO: "Vencido",
};

export function PagamentosScreen() {
  const [cobrancas, setCobrancas] = useState<Cobranca[] | null>(null);

  useEffect(() => {
    api<Cobranca[]>("/cobrancas/minhas").then(setCobrancas);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <Text style={styles.brand}>Pagamentos</Text>
      </View>

      {cobrancas === null && <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} />}

      {cobrancas?.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nenhuma cobrança no momento.</Text>
        </View>
      )}

      {cobrancas && cobrancas.length > 0 && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {cobrancas.map((c) => (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.valor}>R$ {(c.valorCentavos / 100).toFixed(2)}</Text>
                <Text style={[styles.status, c.status === "PAGO" && styles.statusPago]}>
                  {STATUS_LABEL[c.status]}
                </Text>
              </View>
              {c.descricao && <Text style={styles.descricao}>{c.descricao}</Text>}
              {c.status === "PENDENTE" && c.pixQrCodeBase64 && (
                <Image
                  source={{ uri: `data:image/png;base64,${c.pixQrCodeBase64}` }}
                  style={styles.qr}
                  resizeMode="contain"
                />
              )}
              {c.status === "PENDENTE" && c.pixCopiaCola && (
                <Text style={styles.copiaECola} selectable numberOfLines={2}>
                  {c.pixCopiaCola}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  brand: { color: colors.ink, fontWeight: "700", fontSize: 16 },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 24 },
  emptyText: { color: colors.inkMuted, fontSize: 13 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  valor: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  status: { color: colors.brand, fontSize: 12, fontWeight: "600" },
  statusPago: { color: colors.accent },
  descricao: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
  qr: { width: 180, height: 180, alignSelf: "center", marginTop: 12, backgroundColor: "#fff", borderRadius: 8 },
  copiaECola: { color: colors.inkFaint, fontSize: 11, marginTop: 8 },
});
