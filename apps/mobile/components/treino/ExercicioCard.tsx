import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import type { ExercicioEfetivo, SerieRegistrada } from "../../lib/treino/tipos";
import { calcularEstagioRIR, parseDescansoSegundos } from "../../lib/treino/descanso";
import { seriesDoExercicioNaData, ultimaExecucao, upsertSerie } from "../../lib/treino/storage";
import { getExercicioDoSlot, sessoesRegistradasDoExercicio, trocarExercicioDoSlot } from "../../lib/treino/programaAtual";
import { GrupoBadge } from "./GrupoBadge";
import { SeletorExercicio } from "./SeletorExercicio";

const PAPEL_COR: Record<string, string> = {
  DIRETO: colors.brand,
  INDIRETO: colors.inkMuted,
  NEUTRO: colors.inkFaint,
};

function formatarDescanso(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ExercicioCard({
  exercicio,
  data,
  expandido,
  onToggleExpandido,
  onProgresso,
}: {
  exercicio: ExercicioEfetivo;
  data: string;
  expandido: boolean;
  onToggleExpandido: () => void;
  onProgresso?: (exercicioId: string, feitas: number, total: number) => void;
}) {
  const [efetivo, setEfetivo] = useState(exercicio);
  const [series, setSeries] = useState<SerieRegistrada[]>([]);
  const [ultima, setUltima] = useState<SerieRegistrada[]>([]);
  const [trocaAberta, setTrocaAberta] = useState(false);
  const [descansoRestante, setDescansoRestante] = useState<number | null>(null);
  const [dicasAbertas, setDicasAbertas] = useState(false);
  const [kg, setKg] = useState("");
  const [reps, setReps] = useState("");

  useEffect(() => setEfetivo(exercicio), [exercicio]);

  useEffect(() => {
    setSeries(seriesDoExercicioNaData(efetivo.id, data));
    setUltima(ultimaExecucao(efetivo.id, data));
    setDescansoRestante(null);
    setDicasAbertas(false);
  }, [efetivo.id, data]);

  const feitas = series.filter((s) => s.cargaKg !== null || s.reps !== null).length;
  const completo = feitas >= efetivo.series;
  const estagio = calcularEstagioRIR(sessoesRegistradasDoExercicio(efetivo.id));
  const primeiraSerie = series.find((s) => s.serieNumero === 1);
  const ultimaPrimeira = ultima.find((s) => s.serieNumero === 1);

  useEffect(() => {
    setKg((primeiraSerie?.cargaKg ?? "").toString());
    setReps((primeiraSerie?.reps ?? "").toString());
  }, [primeiraSerie?.cargaKg, primeiraSerie?.reps, efetivo.id]);

  useEffect(() => {
    onProgresso?.(efetivo.id, feitas, efetivo.series);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [efetivo.id, feitas, efetivo.series]);

  useEffect(() => {
    if (descansoRestante === null || descansoRestante <= 0) return;
    const id = setTimeout(() => setDescansoRestante((v) => (v === null ? null : v - 1)), 1000);
    return () => clearTimeout(id);
  }, [descansoRestante]);

  function confirmarTodas() {
    if (!kg.trim() || !reps.trim()) return;
    const agora = new Date().toISOString();
    for (let n = 1; n <= efetivo.series; n++) {
      upsertSerie({ exercicioId: efetivo.id, data, serieNumero: n, cargaKg: Number(kg), reps: Number(reps), registradoEm: agora });
    }
    setSeries(seriesDoExercicioNaData(efetivo.id, data));
    const segundos = parseDescansoSegundos(efetivo.descanso);
    if (segundos) setDescansoRestante(segundos);
  }

  function trocarPara(novoId: string, motivo: string) {
    trocarExercicioDoSlot(efetivo.sessao, efetivo.slot, novoId, data, motivo);
    setEfetivo(getExercicioDoSlot(efetivo.sessao, efetivo.slot));
    setTrocaAberta(false);
  }

  const ultimaResumo =
    ultima.length > 0
      ? `Última vez: ${ultima.map((s) => (s.cargaKg != null ? `${s.cargaKg}kg${s.reps != null ? `×${s.reps}` : ""}` : null)).filter(Boolean).join(", ")}`
      : null;

  const kgNum = Number(kg);
  const repsNum = Number(reps);
  const desabilitado = !kg.trim() || !reps.trim() || isNaN(kgNum) || kgNum <= 0 || isNaN(repsNum) || repsNum <= 0;

  return (
    <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.card }]}>
      <View style={styles.headerRow}>
        <Pressable style={{ flex: 1 }} onPress={onToggleExpandido}>
          <View style={styles.titleRow}>
            <Text style={[styles.nome, { color: colors.ink }]} numberOfLines={1}>{efetivo.nome}</Text>
            {completo && <Ionicons name="checkmark" size={15} color={colors.accent} />}
          </View>
          <View style={styles.metaRow}>
            <GrupoBadge grupo={efetivo.grupoMuscular} />
            <Text style={[styles.meta, { color: colors.inkMuted }]}>
              {efetivo.series}×{efetivo.reps} · desc. {efetivo.descanso}
            </Text>
            <Text style={[styles.papel, { color: PAPEL_COR[efetivo.papelPostural] }]}>{efetivo.papelPostural}</Text>
          </View>
        </Pressable>
        <Ionicons name={expandido ? "chevron-up" : "chevron-down"} size={18} color={colors.inkFaint} />
      </View>

      <View style={styles.actionsRow}>
        {efetivo.youtubeId && (
          <Pressable
            onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${efetivo.youtubeId}`)}
            style={[styles.iconBtn, { borderColor: colors.line, backgroundColor: colors.bg }]}
          >
            <Ionicons name="film-outline" size={15} color={colors.inkMuted} />
            <Text style={[styles.iconBtnText, { color: colors.inkMuted }]}>Vídeo</Text>
          </Pressable>
        )}
        <Pressable onPress={() => setTrocaAberta(true)} style={[styles.iconBtn, { borderColor: colors.line, backgroundColor: colors.bg }]}>
          <Ionicons name="repeat" size={13} color={colors.inkMuted} />
          <Text style={[styles.iconBtnText, { color: colors.inkMuted }]}>Trocar</Text>
        </Pressable>
      </View>

      {expandido && (
        <View style={[styles.body, { borderTopColor: colors.line }]}>
          <Text style={[styles.rir, { color: colors.inkFaint }]}>
            RIR alvo: {estagio.rirAlvo} · {estagio.label} ({estagio.sessoesFeitas} sessão{estagio.sessoesFeitas === 1 ? "" : "ões"} neste exercício)
          </Text>

          {(efetivo.execucao || efetivo.notas) && (
            <View style={{ marginBottom: 10 }}>
              <Pressable onPress={() => setDicasAbertas((v) => !v)} style={styles.dicasBtn}>
                <Ionicons name={dicasAbertas ? "chevron-up" : "chevron-down"} size={12} color={colors.inkFaint} />
                <Ionicons name="bulb-outline" size={13} color={colors.inkFaint} />
                <Text style={[styles.dicasLabel, { color: colors.inkFaint }]}>Dicas e execução</Text>
              </Pressable>
              {dicasAbertas && (
                <View style={{ marginTop: 6 }}>
                  {!!efetivo.execucao && <Text style={[styles.execucao, { color: colors.inkMuted }]}>Execução: {efetivo.execucao}</Text>}
                  <Text style={[styles.notas, { color: colors.inkMuted }]}>{efetivo.notas}</Text>
                </View>
              )}
            </View>
          )}

          {ultimaResumo && <Text style={[styles.ultima, { color: colors.brand }]}>{ultimaResumo}</Text>}

          {descansoRestante !== null && descansoRestante > 0 && (
            <View style={[styles.descansoBox, { borderColor: colors.brand + "55", backgroundColor: colors.brand + "22" }]}>
              <View style={styles.descansoRow}>
                <Ionicons name="timer-outline" size={15} color={colors.brand} />
                <Text style={[styles.descansoText, { color: colors.brand }]}>Descanso: {formatarDescanso(descansoRestante)}</Text>
              </View>
              <Pressable onPress={() => setDescansoRestante(null)}>
                <Text style={[styles.pular, { color: colors.brand }]}>pular</Text>
              </Pressable>
            </View>
          )}

          <Text style={[styles.feitasLabel, { color: colors.inkFaint }]}>{feitas}/{efetivo.series} séries</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={kg}
              onChangeText={setKg}
              keyboardType="decimal-pad"
              placeholder={ultimaPrimeira?.cargaKg != null ? `${ultimaPrimeira.cargaKg}` : "kg"}
              placeholderTextColor={colors.inkFaint}
              style={[styles.input, { borderColor: colors.line, backgroundColor: colors.bg, color: colors.ink }]}
            />
            <TextInput
              value={reps}
              onChangeText={setReps}
              keyboardType="number-pad"
              placeholder={ultimaPrimeira?.reps != null ? `${ultimaPrimeira.reps}` : "reps"}
              placeholderTextColor={colors.inkFaint}
              style={[styles.input, { borderColor: colors.line, backgroundColor: colors.bg, color: colors.ink }]}
            />
            <Pressable
              disabled={desabilitado}
              onPress={confirmarTodas}
              style={[
                styles.confirmBtn,
                desabilitado
                  ? { borderColor: colors.line, backgroundColor: colors.bg, opacity: 0.4 }
                  : feitas >= efetivo.series
                  ? { borderColor: colors.accent, backgroundColor: colors.accent + "22" }
                  : { borderColor: colors.brand, backgroundColor: colors.brand },
              ]}
            >
              <Ionicons name="checkmark" size={18} color={desabilitado ? colors.inkFaint : feitas >= efetivo.series ? colors.accent : "#fff"} />
            </Pressable>
          </View>
        </View>
      )}

      {trocaAberta && <SeletorExercicio atual={efetivo} onEscolher={trocarPara} onFechar={() => setTrocaAberta(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, marginBottom: 8, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nome: { fontSize: 14, fontWeight: "600", flexShrink: 1 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 4 },
  meta: { fontSize: 11 },
  papel: { fontSize: 11, fontWeight: "700" },
  actionsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
  iconBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  iconBtnText: { fontSize: 11, fontWeight: "600" },
  body: { borderTopWidth: 1, padding: 12 },
  rir: { fontSize: 11, marginBottom: 8 },
  dicasBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4 },
  dicasLabel: { fontSize: 11, fontWeight: "600" },
  execucao: { fontSize: 11, marginBottom: 4 },
  notas: { fontSize: 13, lineHeight: 18 },
  ultima: { fontSize: 11, fontWeight: "600", marginBottom: 8 },
  descansoBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
  descansoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  descansoText: { fontSize: 12, fontWeight: "600" },
  pular: { fontSize: 11, fontWeight: "600", textDecorationLine: "underline" },
  feitasLabel: { fontSize: 11, marginBottom: 6 },
  inputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  // minWidth: 0 é necessário no react-native-web: sem isso, o <input> mantém seu tamanho
  // intrínseco e não encolhe dentro do flex:1, empurrando o botão de confirmar pra fora.
  input: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 14 },
  confirmBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
