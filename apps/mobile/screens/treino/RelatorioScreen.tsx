import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import {
  calcularVolumePorGrupo,
  totalSeriesNoPeriodo,
  calcularFrequenciaPorSessao,
  calcularFrequenciaPorGrupo,
  type VolumeGrupo,
  type FrequenciaSessao,
  type FrequenciaGrupo,
} from "../../lib/treino/relatorio";
import { getTodosBikeIndoor, getTodasSessoes } from "../../lib/treino/storage";
import type { RegistroSessao, SessaoTreino } from "../../lib/treino/tipos";
import { corCalor } from "../../lib/treino/cor";

const PERIODOS: { label: string; valor: number | "tudo" }[] = [
  { label: "7 dias", valor: 7 },
  { label: "30 dias", valor: 30 },
  { label: "Tudo", valor: "tudo" },
];

const ICONE_SESSAO: Record<SessaoTreino, keyof typeof Ionicons.glyphMap> = {
  PUSH: "arrow-up-circle",
  PULL: "arrow-down-circle",
  LEGS: "footsteps",
};

function formatarHora(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
function formatarDataBR(dataIso: string | null): string {
  if (!dataIso) return "—";
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}
function formatarDuracaoMs(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h${m}min` : `${h}h`;
  }
  return `${min} min`;
}

export function RelatorioScreen() {
  const [aba, setAba] = useState<"geral" | "frequencia">("geral");
  const [periodo, setPeriodo] = useState<number | "tudo">(7);
  const [volumes, setVolumes] = useState<VolumeGrupo[] | null>(null);
  const [totalMinutosBike, setTotalMinutosBike] = useState(0);
  const [sessoesBikeCount, setSessoesBikeCount] = useState(0);
  const [sessoesForca, setSessoesForca] = useState<RegistroSessao[]>([]);
  const [totalMinutosForca, setTotalMinutosForca] = useState(0);
  const [sessoesForcaCount, setSessoesForcaCount] = useState(0);
  const [porSessao, setPorSessao] = useState<FrequenciaSessao[]>([]);
  const [porGrupo, setPorGrupo] = useState<FrequenciaGrupo[]>([]);

  useEffect(() => {
    setVolumes(calcularVolumePorGrupo(periodo));
    setPorSessao(calcularFrequenciaPorSessao(periodo));
    setPorGrupo(calcularFrequenciaPorGrupo(periodo));
    const agora = new Date();

    const bikeData = getTodosBikeIndoor();
    let minBike = 0;
    let countBike = 0;
    Object.values(bikeData).forEach((item) => {
      if (!item.concluido) return;
      if (periodo !== "tudo") {
        const diff = (agora.getTime() - new Date(item.data + "T00:00:00").getTime()) / 86400000;
        if (diff > periodo) return;
      }
      minBike += item.tempoMinutos;
      countBike += 1;
    });
    setTotalMinutosBike(minBike);
    setSessoesBikeCount(countBike);

    const sessoesMap = getTodasSessoes();
    const lista: RegistroSessao[] = [];
    let minForca = 0;
    let countForca = 0;
    Object.values(sessoesMap).forEach((l) => {
      l.forEach((sessao) => {
        if (periodo !== "tudo") {
          const diff = (agora.getTime() - new Date(sessao.data + "T00:00:00").getTime()) / 86400000;
          if (diff > periodo) return;
        }
        lista.push(sessao);
        if (sessao.fimISO) {
          countForca += 1;
          minForca += Math.max(0, Math.round((new Date(sessao.fimISO).getTime() - new Date(sessao.inicioISO).getTime()) / 60000));
        }
      });
    });
    lista.sort((a, b) => (a.data !== b.data ? b.data.localeCompare(a.data) : new Date(b.inicioISO).getTime() - new Date(a.inicioISO).getTime()));
    setSessoesForca(lista);
    setTotalMinutosForca(minForca);
    setSessoesForcaCount(countForca);
  }, [periodo]);

  const maxDias = Math.max(1, ...porGrupo.map((g) => g.diasTreinados));
  const totalSessoesFreq = porSessao.reduce((s, x) => s + x.sessoesConcluidas, 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Text style={[styles.h1, { color: colors.ink }]}>Relatório de Evolução</Text>
      <Text style={[styles.subtitle, { color: colors.inkMuted }]}>Acompanhamento diário de treinos e volume muscular</Text>

      <View style={[styles.segment, { borderColor: colors.line, backgroundColor: colors.card }]}>
        <Pressable onPress={() => setAba("geral")} style={[styles.segmentBtn, aba === "geral" && { backgroundColor: colors.brand }]}>
          <Text style={[styles.segmentText, { color: aba === "geral" ? "#fff" : colors.inkMuted }]}>Visão Geral</Text>
        </Pressable>
        <Pressable onPress={() => setAba("frequencia")} style={[styles.segmentBtn, aba === "frequencia" && { backgroundColor: colors.brand }]}>
          <Text style={[styles.segmentText, { color: aba === "frequencia" ? "#fff" : colors.inkMuted }]}>Frequência</Text>
        </Pressable>
      </View>

      <View style={styles.periodos}>
        {PERIODOS.map((p) => {
          const sel = periodo === p.valor;
          return (
            <Pressable
              key={p.label}
              onPress={() => setPeriodo(p.valor)}
              style={[styles.periodoBtn, { borderColor: sel ? colors.brand : colors.line, backgroundColor: sel ? colors.brand : colors.card }]}
            >
              <Text style={{ color: sel ? "#fff" : colors.inkMuted, fontSize: 12, fontWeight: "600" }}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {aba === "geral" ? (
        <>
          <View style={styles.cardsRow}>
            <View style={[styles.summaryCard, { borderColor: colors.line, backgroundColor: colors.card }]}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.brand + "22" }]}>
                <Ionicons name="barbell" size={17} color={colors.brand} />
              </View>
              <Text style={[styles.summaryTitle, { color: colors.ink }]}>Treinos de Força</Text>
              <Text style={[styles.summaryText, { color: colors.inkMuted }]}>
                {sessoesForcaCount > 0 ? `${sessoesForcaCount} sessão(ões) · ${totalMinutosForca} min` : "Nenhum treino concluído"}
              </Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: colors.line, backgroundColor: colors.card }]}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.accent + "22" }]}>
                <Ionicons name="bicycle" size={17} color={colors.accent} />
              </View>
              <Text style={[styles.summaryTitle, { color: colors.ink }]}>Bike Indoor</Text>
              <Text style={[styles.summaryText, { color: colors.inkMuted }]}>
                {sessoesBikeCount > 0 ? `${sessoesBikeCount} sessão(ões) · ${totalMinutosBike} min` : "Nenhuma sessão registrada"}
              </Text>
            </View>
          </View>

          <View style={[styles.section, { borderColor: colors.line, backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.ink }]}>Histórico de Treinos</Text>
              <Text style={[styles.sectionCount, { color: colors.inkFaint }]}>{sessoesForca.length} registro(s)</Text>
            </View>
            {sessoesForca.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.inkMuted }]}>Nenhum treino no período selecionado.</Text>
            ) : (
              sessoesForca.map((sessao, i) => {
                const concluido = Boolean(sessao.fimISO);
                const duracaoMs = sessao.fimISO ? new Date(sessao.fimISO).getTime() - new Date(sessao.inicioISO).getTime() : 0;
                return (
                  <View key={`${sessao.data}-${sessao.sessaoTipo}-${i}`} style={[styles.histRow, { borderColor: colors.line + "55" }]}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.histTop}>
                        <View style={[styles.histTag, { backgroundColor: (concluido ? colors.accent : colors.brand) + "33" }]}>
                          <Text style={{ color: concluido ? colors.accent : colors.brand, fontSize: 10, fontWeight: "700" }}>{sessao.sessaoTipo}</Text>
                        </View>
                        <Text style={[styles.histData, { color: colors.ink }]}>{formatarDataBR(sessao.data)}</Text>
                      </View>
                      <Text style={[styles.histHora, { color: colors.inkMuted }]}>
                        Início: {formatarHora(sessao.inicioISO)} {sessao.fimISO ? `· Fim: ${formatarHora(sessao.fimISO)}` : "· Em andamento"}
                      </Text>
                    </View>
                    <View style={[styles.histBadge, { backgroundColor: (concluido ? colors.accent : colors.brand) + "22" }]}>
                      <Text style={{ color: concluido ? colors.accent : colors.brand, fontSize: 10, fontWeight: "700" }}>
                        {concluido ? formatarDuracaoMs(duracaoMs) : "Em andamento"}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {volumes && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.sectionTitle, { color: colors.ink, marginBottom: 8 }]}>Volume por Grupo Muscular</Text>
              {volumes.every((v) => v.seriesFeitas === 0) && (
                <Text style={[styles.emptyText, { color: colors.inkMuted }]}>Nenhuma série registrada no período selecionado.</Text>
              )}
              {volumes
                .filter((v) => v.seriesFeitas > 0)
                .map((v) => (
                  <View key={v.grupo} style={{ marginBottom: 8 }}>
                    <View style={styles.volumeRow}>
                      <Text style={[styles.volumeLabel, { color: colors.ink }]}>{v.grupo}</Text>
                      <Text style={[styles.volumeValue, { color: colors.inkFaint }]}>{v.seriesFeitas} séries</Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: colors.card }]}>
                      <View style={[styles.fill, { width: `${v.pct}%`, backgroundColor: corCalor(v.pct / 100) }]} />
                    </View>
                  </View>
                ))}
              <Text style={[styles.totalText, { color: colors.inkFaint }]}>Total: {totalSeriesNoPeriodo(volumes)} séries registradas no período</Text>
            </View>
          )}
        </>
      ) : (
        <>
          <View style={[styles.section, { borderColor: colors.line, backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.ink }]}>Quais Treinos</Text>
              <Text style={[styles.sectionCount, { color: colors.inkFaint }]}>{totalSessoesFreq} concluída(s)</Text>
            </View>
            {totalSessoesFreq === 0 ? (
              <Text style={[styles.emptyText, { color: colors.inkMuted }]}>Nenhum treino concluído no período.</Text>
            ) : (
              <View style={styles.freqGrid}>
                {porSessao.map((s) => (
                  <View key={s.tipo} style={[styles.freqTile, { borderColor: colors.line + "55", backgroundColor: colors.bg }]}>
                    <View style={styles.freqTop}>
                      <Ionicons name={ICONE_SESSAO[s.tipo]} size={16} color={colors.brand} />
                      <Text style={[styles.freqTipo, { color: colors.ink }]}>{s.tipo}</Text>
                    </View>
                    <Text style={[styles.freqNum, { color: colors.ink }]}>{s.sessoesConcluidas}</Text>
                    <Text style={[styles.freqSub, { color: colors.inkMuted }]}>última em {formatarDataBR(s.ultimaData)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={[styles.section, { borderColor: colors.line, backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.ink, marginBottom: 10 }]}>Quais Grupos Musculares</Text>
            {porGrupo.every((g) => g.diasTreinados === 0) ? (
              <Text style={[styles.emptyText, { color: colors.inkMuted }]}>Ainda não há séries registradas neste período.</Text>
            ) : (
              porGrupo.map((g) => (
                <View key={g.grupo} style={{ marginBottom: 10 }}>
                  <View style={styles.volumeRow}>
                    <Text style={[styles.volumeLabel, { color: colors.ink }]}>{g.grupo}</Text>
                    <Text style={[styles.volumeValue, { color: colors.inkFaint }]}>
                      {g.diasTreinados} {g.diasTreinados === 1 ? "dia" : "dias"} · {formatarDataBR(g.ultimaData)}
                    </Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: colors.bg }]}>
                    <View style={[styles.fill, { width: `${(g.diasTreinados / maxDias) * 100}%`, backgroundColor: g.diasTreinados > 0 ? corCalor(g.diasTreinados / maxDias) : "transparent" }]} />
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  h1: { fontSize: 19, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2, marginBottom: 12 },
  segment: { flexDirection: "row", borderWidth: 1, borderRadius: 999, padding: 3, marginBottom: 12 },
  segmentBtn: { flex: 1, borderRadius: 999, paddingVertical: 7, alignItems: "center" },
  segmentText: { fontSize: 12, fontWeight: "700" },
  periodos: { flexDirection: "row", gap: 8, marginBottom: 16 },
  periodoBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  cardsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12 },
  summaryIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  summaryTitle: { fontSize: 12, fontWeight: "700" },
  summaryText: { fontSize: 11, marginTop: 3 },
  section: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "700" },
  sectionCount: { fontSize: 11 },
  emptyText: { fontSize: 12, textAlign: "center", paddingVertical: 12 },
  histRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  histTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  histTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  histData: { fontSize: 12, fontWeight: "700" },
  histHora: { fontSize: 10, marginTop: 3 },
  histBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  volumeRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  volumeLabel: { fontSize: 12, fontWeight: "600" },
  volumeValue: { fontSize: 11 },
  track: { height: 8, borderRadius: 999, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999 },
  totalText: { fontSize: 11, textAlign: "center", marginTop: 8 },
  freqGrid: { flexDirection: "row", gap: 8 },
  freqTile: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10 },
  freqTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  freqTipo: { fontSize: 11, fontWeight: "700" },
  freqNum: { fontSize: 20, fontWeight: "700" },
  freqSub: { fontSize: 10, marginTop: 2 },
});
