import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import { getDataInicio, getSessaoEscolhida, setSessaoEscolhida } from "../../lib/treino/storage";
import { getStatusPrograma, sessaoDoDia, toISODate, SESSAO_LABEL, type StatusPrograma } from "../../lib/treino/program";
import { POSTURAL } from "../../lib/treino/exercicios";
import { getSessaoCompleta } from "../../lib/treino/programaAtual";
import { gerarInsightHoje, gerarInsightAmanha } from "../../lib/treino/motivacao";
import { progressoSemana, progressoCiclo } from "../../lib/treino/progresso";
import { ExercicioCard } from "../../components/treino/ExercicioCard";
import { ExercicioPosturalCard } from "../../components/treino/ExercicioPosturalCard";
import { GuiaModal, dataInicioPadrao } from "../../components/treino/GuiaModal";
import { SeletorSessao } from "../../components/treino/SeletorSessao";
import { TreinoTimer } from "../../components/treino/TreinoTimer";
import { BikeIndoorCard } from "../../components/treino/BikeIndoorCard";
import { ProgressoSemana, ProgressoCiclo } from "../../components/treino/ProgressoBarras";
import type { EscolhaDoDia } from "../../lib/treino/tipos";

const DIAS_SEMANA_LABEL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function HojeScreen() {
  const [dataInicio, setDataInicioState] = useState<string>("");
  const [hoje] = useState(() => new Date());
  const [postural, setPostural] = useState(false);
  const [escolha, setEscolha] = useState<EscolhaDoDia | null>(null);
  const [exercicioAbertoId, setExercicioAbertoId] = useState<string | null>(null);
  const [posturalAbertoId, setPosturalAbertoId] = useState<string | null>(null);
  const [progressoPorExercicio, setProgressoPorExercicio] = useState<Record<string, { feitas: number; total: number }>>({});

  const hojeISO = toISODate(hoje);

  useEffect(() => {
    setDataInicioState(getDataInicio() ?? dataInicioPadrao());
    setEscolha(getSessaoEscolhida(hojeISO));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status: StatusPrograma | null = dataInicio ? getStatusPrograma(dataInicio, hoje) : null;
  const sessaoSugerida = sessaoDoDia(hoje);
  const sessaoEfetiva = escolha === "DESCANSO" ? null : escolha ?? sessaoSugerida;
  const exercicios = sessaoEfetiva ? getSessaoCompleta(sessaoEfetiva) : [];

  const insightHoje = status ? gerarInsightHoje(status, hojeISO, sessaoEfetiva) : null;
  const insightAmanha = status ? gerarInsightAmanha(status) : null;

  useEffect(() => {
    if (exercicios.length === 0) {
      setExercicioAbertoId(null);
      return;
    }
    setExercicioAbertoId((atual) => {
      if (atual) {
        const aindaNaLista = exercicios.some((e) => e.id === atual);
        const p = progressoPorExercicio[atual];
        if (aindaNaLista && (!p || p.feitas < p.total)) return atual;
      }
      const proximo = exercicios.find((e) => {
        const p = progressoPorExercicio[e.id];
        return !p || p.feitas < p.total;
      });
      return proximo ? proximo.id : null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessaoEfetiva, progressoPorExercicio]);

  function escolher(valor: EscolhaDoDia) {
    setSessaoEscolhida(hojeISO, valor);
    setEscolha(valor);
  }

  function handleProgresso(exercicioId: string, feitas: number, total: number) {
    setProgressoPorExercicio((prev) => {
      const atual = prev[exercicioId];
      if (atual && atual.feitas === feitas && atual.total === total) return prev;
      return { ...prev, [exercicioId]: { feitas, total } };
    });
  }

  const progressoSessao = exercicios.reduce(
    (acc, ex) => {
      const p = progressoPorExercicio[ex.id];
      const total = p?.total ?? ex.series;
      const feitas = p ? Math.min(p.feitas, total) : 0;
      return { feitas: acc.feitas + feitas, total: acc.total + total };
    },
    { feitas: 0, total: 0 },
  );
  const progressoSessaoPct = progressoSessao.total > 0 ? Math.min(100, (progressoSessao.feitas / progressoSessao.total) * 100) : 0;

  if (!dataInicio) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.diaLabel, { color: colors.inkFaint }]}>{DIAS_SEMANA_LABEL[hoje.getDay()]}</Text>
          <Text style={[styles.h1, { color: colors.ink }]}>{sessaoEfetiva ? `Treino de hoje: ${sessaoEfetiva}` : "Hoje é descanso"}</Text>
        </View>
        <GuiaModal dataInicio={dataInicio} onDataInicioChange={setDataInicioState} />
      </View>

      {sessaoEfetiva && exercicios.length > 0 && (
        <View style={[styles.sessaoProgresso, { borderColor: colors.line, backgroundColor: colors.card }]}>
          <View style={styles.sessaoProgressoHeader}>
            <Text style={[styles.sessaoProgressoLabel, { color: colors.ink }]}>Sessão de hoje</Text>
            <Text style={[styles.sessaoProgressoValor, { color: colors.inkMuted }]}>{progressoSessao.feitas} de {progressoSessao.total} séries</Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.bg }]}>
            <View style={[styles.fill, { width: `${progressoSessaoPct}%`, backgroundColor: colors.accent }]} />
          </View>
        </View>
      )}

      {insightHoje && (
        <View style={[styles.insight, { borderColor: colors.brand + "55", backgroundColor: colors.brand + "22" }]}>
          <Text style={[styles.insightTitulo, { color: colors.brand }]}>{insightHoje.titulo}</Text>
          <Text style={[styles.insightMsg, { color: colors.inkMuted }]}>{insightHoje.mensagem}</Text>
        </View>
      )}

      <SeletorSessao hojeISO={hojeISO} sessaoSugerida={sessaoSugerida} valorAtual={escolha} onEscolher={escolher} />

      <BikeIndoorCard hojeISO={hojeISO} />

      {sessaoEfetiva && status && <TreinoTimer hojeISO={hojeISO} sessaoTipo={sessaoEfetiva} />}

      {status && (
        <>
          <ProgressoSemana info={progressoSemana(status)} />
          <ProgressoCiclo segmentos={progressoCiclo(status)} />
        </>
      )}

      {status?.isDeload && sessaoEfetiva && (
        <View style={[styles.deloadWarn, { borderColor: colors.danger + "55", backgroundColor: colors.danger + "22" }]}>
          <Ionicons name="warning" size={15} color={colors.danger} style={{ marginTop: 1 }} />
          <Text style={[styles.deloadText, { color: colors.danger }]}>Semana de deload — metade das séries, esforço leve, cargas reduzidas em 10%.</Text>
        </View>
      )}

      {sessaoEfetiva && (
        <>
          <View style={{ marginBottom: 16 }}>
            <Pressable onPress={() => setPostural((v) => !v)} style={styles.posturalToggle}>
              <Text style={[styles.posturalLabel, { color: colors.inkMuted }]}>Bloco postural diário (em casa, fora da academia)</Text>
              <Ionicons name={postural ? "chevron-up" : "chevron-down"} size={16} color={colors.inkMuted} />
            </Pressable>
            {postural && (
              <View style={{ marginTop: 8 }}>
                {POSTURAL.map((ex) => (
                  <ExercicioPosturalCard
                    key={ex.id}
                    exercicio={ex}
                    data={hojeISO}
                    expandido={posturalAbertoId === ex.id}
                    onToggleExpandido={() => setPosturalAbertoId((atual) => (atual === ex.id ? null : ex.id))}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.inkMuted }]}>{SESSAO_LABEL[sessaoEfetiva]}</Text>
            {exercicios.map((ex) => (
              <ExercicioCard
                key={ex.id}
                exercicio={ex}
                data={hojeISO}
                expandido={exercicioAbertoId === ex.id}
                onToggleExpandido={() => setExercicioAbertoId((atual) => (atual === ex.id ? null : ex.id))}
                onProgresso={handleProgresso}
              />
            ))}
          </View>
        </>
      )}

      {insightAmanha && (
        <View style={[styles.insightAmanha, { borderColor: colors.line, backgroundColor: colors.card }]}>
          <Text style={[styles.insightTitulo, { color: colors.ink }]}>{insightAmanha.titulo}</Text>
          <Text style={[styles.insightMsg, { color: colors.inkMuted }]}>{insightAmanha.mensagem}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  diaLabel: { fontSize: 11 },
  h1: { fontSize: 19, fontWeight: "700", marginTop: 2 },
  sessaoProgresso: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 12 },
  sessaoProgressoHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  sessaoProgressoLabel: { fontSize: 12, fontWeight: "600" },
  sessaoProgressoValor: { fontSize: 12 },
  track: { height: 6, borderRadius: 999, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999 },
  insight: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  insightTitulo: { fontSize: 14, fontWeight: "700" },
  insightMsg: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  deloadWarn: { flexDirection: "row", gap: 8, borderWidth: 1, borderRadius: 14, padding: 10, marginBottom: 16 },
  deloadText: { fontSize: 12, fontWeight: "600", flex: 1 },
  posturalToggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  posturalLabel: { fontSize: 13, fontWeight: "600" },
  sectionTitle: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  insightAmanha: { borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 4 },
});
