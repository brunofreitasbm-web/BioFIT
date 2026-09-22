import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import { statusDescansoPorSessao } from "../../lib/treino/descanso";
import type { EscolhaDoDia, SessaoTreino } from "../../lib/treino/tipos";

const OPCOES: { tipo: SessaoTreino; label: string }[] = [
  { tipo: "PUSH", label: "Push" },
  { tipo: "PULL", label: "Pull" },
  { tipo: "LEGS", label: "Legs" },
];

export function SeletorSessao({
  hojeISO,
  sessaoSugerida,
  valorAtual,
  onEscolher,
}: {
  hojeISO: string;
  sessaoSugerida: SessaoTreino | null;
  valorAtual: EscolhaDoDia | null;
  onEscolher: (valor: EscolhaDoDia) => void;
}) {
  const efetivo: EscolhaDoDia | null = valorAtual ?? sessaoSugerida ?? "DESCANSO";

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>Treino de hoje</Text>
      <View style={styles.chips}>
        {OPCOES.map((op) => {
          const status = statusDescansoPorSessao(op.tipo, hojeISO);
          const algumEmRecuperacao = status.some((s) => s.emRecuperacao);
          const selecionado = efetivo === op.tipo;
          return (
            <Pressable
              key={op.tipo}
              onPress={() => onEscolher(op.tipo)}
              style={[
                styles.chip,
                { borderColor: selecionado ? colors.brand : colors.line, backgroundColor: selecionado ? colors.brand : colors.card },
              ]}
            >
              <Text style={[styles.chipText, { color: selecionado ? "#fff" : colors.inkMuted }]}>{op.label}</Text>
              {algumEmRecuperacao && (
                <Ionicons name="warning" size={13} color={selecionado ? "#fff" : colors.danger} />
              )}
              {op.tipo === sessaoSugerida && !selecionado && <Text style={styles.sugestao}>sugestão</Text>}
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => onEscolher("DESCANSO")}
          style={[
            styles.chip,
            { borderColor: efetivo === "DESCANSO" ? colors.brand : colors.line, backgroundColor: efetivo === "DESCANSO" ? colors.brand : colors.card },
          ]}
        >
          <Text style={[styles.chipText, { color: efetivo === "DESCANSO" ? "#fff" : colors.inkMuted }]}>Descanso</Text>
        </Pressable>
      </View>

      {efetivo !== "DESCANSO" &&
        (() => {
          const status = statusDescansoPorSessao(efetivo, hojeISO);
          const avisos = status.filter((s) => s.emRecuperacao);
          if (avisos.length === 0) return null;
          return (
            <View style={[styles.aviso, { backgroundColor: colors.danger + "22" }]}>
              <Ionicons name="warning" size={13} color={colors.danger} style={{ marginTop: 1 }} />
              <Text style={[styles.avisoText, { color: colors.danger }]}>
                {avisos
                  .map((a) => `${a.grupo} treinado há ${a.diasDesdeUltimo === 0 ? "hoje" : `${a.diasDesdeUltimo} dia(s)`}`)
                  .join(" · ")}{" "}
                — ainda em recuperação, mas a escolha é sua.
              </Text>
            </View>
          );
        })()}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.inkMuted, fontSize: 12, fontWeight: "600", marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 13, fontWeight: "600" },
  sugestao: { fontSize: 9, color: colors.inkFaint },
  aviso: { flexDirection: "row", gap: 6, borderRadius: 10, padding: 8, marginTop: 8 },
  avisoText: { fontSize: 11, flex: 1 },
});
