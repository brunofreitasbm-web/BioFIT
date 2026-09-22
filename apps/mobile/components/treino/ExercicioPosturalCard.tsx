import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import type { ExercicioPostural, SerieRegistrada } from "../../lib/treino/tipos";
import { seriesDoExercicioNaData, upsertSerie } from "../../lib/treino/storage";
import { GrupoBadge } from "./GrupoBadge";

export function ExercicioPosturalCard({
  exercicio,
  data,
  expandido,
  onToggleExpandido,
}: {
  exercicio: ExercicioPostural;
  data: string;
  expandido: boolean;
  onToggleExpandido: () => void;
}) {
  const [series, setSeries] = useState<SerieRegistrada[]>([]);
  const [dicasAbertas, setDicasAbertas] = useState(false);

  useEffect(() => {
    setSeries(seriesDoExercicioNaData(exercicio.id, data));
    setDicasAbertas(false);
  }, [exercicio.id, data]);

  const feitas = series.filter((s) => s.reps !== null).length;
  const completo = feitas >= exercicio.series;

  function toggleSerie(n: number, feita: boolean) {
    upsertSerie({
      exercicioId: exercicio.id,
      data,
      serieNumero: n,
      cargaKg: null,
      reps: feita ? null : 1,
      registradoEm: new Date().toISOString(),
    });
    setSeries(seriesDoExercicioNaData(exercicio.id, data));
  }

  return (
    <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.card }]}>
      <Pressable style={styles.headerRow} onPress={onToggleExpandido}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.nome, { color: colors.ink }]} numberOfLines={1}>{exercicio.nome}</Text>
            {completo && <Ionicons name="checkmark" size={15} color={colors.accent} />}
          </View>
          <View style={styles.metaRow}>
            <GrupoBadge grupo={exercicio.grupoMuscular} />
            <Text style={[styles.meta, { color: colors.inkMuted }]}>{exercicio.series}×{exercicio.reps} · {exercicio.frequencia}</Text>
          </View>
        </View>
        {exercicio.youtubeId && (
          <Pressable onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${exercicio.youtubeId}`)} hitSlop={8}>
            <Ionicons name="film-outline" size={16} color={colors.inkMuted} />
          </Pressable>
        )}
        <Ionicons name={expandido ? "chevron-up" : "chevron-down"} size={18} color={colors.inkFaint} />
      </Pressable>

      {expandido && (
        <View style={[styles.body, { borderTopColor: colors.line }]}>
          {!!exercicio.notas && (
            <View style={{ marginBottom: 10 }}>
              <Pressable onPress={() => setDicasAbertas((v) => !v)} style={styles.dicasBtn}>
                <Ionicons name={dicasAbertas ? "chevron-up" : "chevron-down"} size={12} color={colors.inkFaint} />
                <Ionicons name="bulb-outline" size={13} color={colors.inkFaint} />
                <Text style={[styles.dicasLabel, { color: colors.inkFaint }]}>Dicas e execução</Text>
              </Pressable>
              {dicasAbertas && <Text style={[styles.notas, { color: colors.inkMuted }]}>{exercicio.notas}</Text>}
            </View>
          )}
          <Text style={[styles.feitasLabel, { color: colors.inkFaint }]}>{feitas}/{exercicio.series} séries</Text>
          <View style={styles.seriesRow}>
            {Array.from({ length: exercicio.series }, (_, i) => i + 1).map((n) => {
              const feita = series.some((s) => s.serieNumero === n && s.reps !== null);
              return (
                <Pressable
                  key={n}
                  onPress={() => toggleSerie(n, feita)}
                  style={[
                    styles.serieBtn,
                    feita ? { borderColor: colors.accent, backgroundColor: colors.accent + "22" } : { borderColor: colors.brand, backgroundColor: colors.brand },
                  ]}
                >
                  <Text style={{ color: feita ? colors.accent : "#fff", fontWeight: "700", fontSize: 13 }}>{n}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, marginBottom: 8, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nome: { fontSize: 14, fontWeight: "600", flexShrink: 1 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 4 },
  meta: { fontSize: 11 },
  body: { borderTopWidth: 1, padding: 12 },
  dicasBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4 },
  dicasLabel: { fontSize: 11, fontWeight: "600" },
  notas: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  feitasLabel: { fontSize: 11, marginBottom: 6 },
  seriesRow: { flexDirection: "row", gap: 8 },
  serieBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
