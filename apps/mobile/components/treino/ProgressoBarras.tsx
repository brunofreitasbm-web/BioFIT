import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";
import { SEMANAS_TRABALHO } from "../../lib/treino/program";
import type { ProgressoSemanaInfo, SegmentoCiclo } from "../../lib/treino/progresso";

export function ProgressoSemana({ info }: { info: ProgressoSemanaInfo }) {
  const pct = Math.min(100, info.pct);
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{info.isDeload ? "Semana de deload" : `Semana ${info.semana} de ${SEMANAS_TRABALHO}`}</Text>
        <Text style={styles.value}>{info.concluidas}/{info.esperado} sessões</Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.card }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.brand }]} />
      </View>
    </View>
  );
}

export function ProgressoCiclo({ segmentos }: { segmentos: SegmentoCiclo[] }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.cicloLabel}>Ciclo de deload (8 semanas + 1 de deload)</Text>
      <View style={styles.segmentos}>
        {segmentos.map((s) => (
          <View key={s.label} style={{ flex: 1 }}>
            <View style={[styles.segTrack, { backgroundColor: s.atual ? colors.brand + "33" : colors.card }]}>
              <View style={[styles.segFill, { width: `${Math.min(100, s.pct)}%`, backgroundColor: s.atual ? colors.brand : colors.accent }]} />
            </View>
            <Text style={[styles.segText, s.atual ? { color: colors.brand, fontWeight: "700" } : { color: colors.inkFaint }]}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { color: colors.inkMuted, fontSize: 11, fontWeight: "600" },
  value: { color: colors.inkMuted, fontSize: 11 },
  track: { height: 7, borderRadius: 999, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999 },
  cicloLabel: { color: colors.inkMuted, fontSize: 11, fontWeight: "600", marginBottom: 4 },
  segmentos: { flexDirection: "row", gap: 3 },
  segTrack: { height: 6, borderRadius: 999, overflow: "hidden" },
  segFill: { height: "100%", borderRadius: 999 },
  segText: { fontSize: 9, textAlign: "center", marginTop: 2 },
});
