import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import { getSessaoAtiva, iniciarSessao, reabrirSessao, terminarSessao } from "../../lib/treino/storage";
import type { RegistroSessao, SessaoTreino } from "../../lib/treino/tipos";

function formatarDuracao(ms: number): string {
  const totalSegundos = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}min`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TreinoTimer({ hojeISO, sessaoTipo }: { hojeISO: string; sessaoTipo: SessaoTreino }) {
  
  const [registro, setRegistro] = useState<RegistroSessao | null>(null);
  const [agora, setAgora] = useState<number>(0);

  useEffect(() => {
    setRegistro(getSessaoAtiva(hojeISO, sessaoTipo));
    setAgora(Date.now());
  }, [hojeISO, sessaoTipo]);

  useEffect(() => {
    if (!registro || registro.fimISO) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [registro]);

  function iniciar() {
    iniciarSessao(hojeISO, sessaoTipo);
    setRegistro(getSessaoAtiva(hojeISO, sessaoTipo));
    setAgora(Date.now());
  }

  function terminar() {
    Alert.alert("Terminar treino", `Terminar o treino de ${sessaoTipo} agora? Dá pra reabrir depois se precisar.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Terminar",
        style: "destructive",
        onPress: () => {
          terminarSessao(hojeISO, sessaoTipo);
          setRegistro(getSessaoAtiva(hojeISO, sessaoTipo));
        },
      },
    ]);
  }

  function reabrir() {
    reabrirSessao(hojeISO, sessaoTipo);
    setRegistro(getSessaoAtiva(hojeISO, sessaoTipo));
    setAgora(Date.now());
  }

  if (!registro) {
    return (
      <Pressable
        onPress={iniciar}
        style={[styles.startBtn, { backgroundColor: colors.brand }]}
        accessibilityRole="button"
      >
        <Ionicons name="play" size={16} color="#fff" />
        <Text style={styles.startBtnText}>Iniciar treino de {sessaoTipo}</Text>
      </Pressable>
    );
  }

  if (!registro.fimISO) {
    const decorrido = agora - new Date(registro.inicioISO).getTime();
    return (
      <View style={styles.row}>
        <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.card }]}>
          <View style={styles.liveRow}>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <Text style={[styles.cardText, { color: colors.inkMuted }]}>Treino de {sessaoTipo} em andamento</Text>
          </View>
          <Text style={[styles.timer, { color: colors.ink }]}>{formatarDuracao(decorrido)}</Text>
        </View>
        <Pressable onPress={terminar} style={[styles.stopBtn, { backgroundColor: colors.danger }]}>
          <Ionicons name="square" size={13} color="#fff" />
          <Text style={styles.startBtnText}>Terminar</Text>
        </Pressable>
      </View>
    );
  }

  const duracaoFinal = new Date(registro.fimISO).getTime() - new Date(registro.inicioISO).getTime();
  return (
    <View style={[styles.doneCard, { borderColor: colors.accent + "55", backgroundColor: colors.accent + "22" }]}>
      <View style={styles.liveRow}>
        <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
        <Text style={[styles.doneText, { color: colors.accent }]}>
          Treino de {sessaoTipo} concluído · {formatarDuracao(duracaoFinal)}
        </Text>
      </View>
      <Pressable onPress={reabrir}>
        <Text style={[styles.reabrir, { color: colors.inkMuted }]}>reabrir</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 16,
  },
  startBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  row: { flexDirection: "row", gap: 8, marginBottom: 16, alignItems: "stretch" },
  card: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, justifyContent: "center" },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  cardText: { fontSize: 13 },
  timer: { fontSize: 14, fontWeight: "700", marginTop: 2, fontVariant: ["tabular-nums"] },
  stopBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 14, paddingHorizontal: 14, justifyContent: "center" },
  doneCard: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, gap: 4 },
  doneText: { fontSize: 13, fontWeight: "600" },
  reabrir: { fontSize: 11, fontWeight: "600", textDecorationLine: "underline" },
});
