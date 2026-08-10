import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { colors } from "../theme";

interface ResumoGrupo {
  grupoMuscular: string;
  volumeTotal: number;
}

const GRUPO_LABEL: Record<string, string> = {
  PEITO: "Peito",
  COSTAS: "Costas",
  OMBRO: "Ombro",
  BICEPS: "Bíceps",
  TRICEPS: "Tríceps",
  QUADRICEPS: "Quadríceps",
  POSTERIOR_COXA: "Posterior de coxa",
  GLUTEO: "Glúteo",
  PANTURRILHA: "Panturrilha",
  ABDOMEN: "Abdômen",
  ANTEBRACO: "Antebraço",
  CARDIO: "Cardio",
};

export function ProgressoScreen() {
  const [resumo, setResumo] = useState<ResumoGrupo[] | null>(null);

  useEffect(() => {
    api<ResumoGrupo[]>("/execucoes/resumo").then(setResumo);
  }, []);

  const max = resumo && resumo.length > 0 ? resumo[0].volumeTotal : 0;

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <Text style={styles.brand}>Progresso</Text>
      </View>

      {resumo === null && <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} />}

      {resumo?.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Ainda sem séries registradas nos últimos 28 dias.</Text>
        </View>
      )}

      {resumo && resumo.length > 0 && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.subtitle}>Volume por grupo muscular (últimos 28 dias)</Text>
          {resumo.map((r) => (
            <View key={r.grupoMuscular} style={styles.row}>
              <Text style={styles.rowLabel}>{GRUPO_LABEL[r.grupoMuscular] ?? r.grupoMuscular}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${max ? (r.volumeTotal / max) * 100 : 0}%` }]} />
              </View>
              <Text style={styles.rowValue}>{r.volumeTotal} kg</Text>
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
  emptyText: { color: colors.inkMuted, fontSize: 13, textAlign: "center" },
  subtitle: { color: colors.inkMuted, fontSize: 13, marginBottom: 16 },
  row: { marginBottom: 14 },
  rowLabel: { color: colors.ink, fontSize: 13, fontWeight: "500", marginBottom: 4 },
  barTrack: { height: 10, borderRadius: 6, backgroundColor: colors.card, overflow: "hidden" },
  barFill: { height: 10, borderRadius: 6, backgroundColor: colors.accent },
  rowValue: { color: colors.inkFaint, fontSize: 11, marginTop: 4 },
});
