import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import type { ExercicioEfetivo } from "../../lib/treino/tipos";
import { opcoesDoSlot } from "../../lib/treino/exercicios";
import { GrupoBadge } from "./GrupoBadge";

const MOTIVOS = ["Estagnação", "Dor/desconforto", "Falta de equipamento", "Outro"];

export function SeletorExercicio({
  atual,
  onEscolher,
  onFechar,
}: {
  atual: ExercicioEfetivo;
  onEscolher: (novoId: string, motivo: string) => void;
  onFechar: () => void;
}) {
  const opcoes = opcoesDoSlot(atual.sessao, atual.slot).filter((o) => o.id !== atual.id);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);

  return (
    <Modal animationType="slide" transparent onRequestClose={onFechar}>
      <Pressable style={styles.backdrop} onPress={onFechar}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.ink }]}>Trocar exercício</Text>
            <Pressable onPress={onFechar} hitSlop={12}>
              <Ionicons name="close" size={20} color={colors.inkMuted} />
            </Pressable>
          </View>
          <Text style={[styles.hint, { color: colors.inkMuted }]}>
            Isso muda o Programa Atual (não é só por hoje) e fica registrado no Log de Trocas. Séries, reps e descanso
            continuam os mesmos, só o exercício muda.
          </Text>
          <View style={{ marginBottom: 4 }}>
            <GrupoBadge grupo={atual.grupoMuscular} />
          </View>

          <Text style={[styles.motivoLabel, { color: colors.inkMuted }]}>Motivo da troca</Text>
          <View style={styles.motivos}>
            {MOTIVOS.map((m) => {
              const sel = motivo === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMotivo(m)}
                  style={[styles.motivoChip, { borderColor: sel ? colors.brand : colors.line, backgroundColor: sel ? colors.brand + "22" : "transparent" }]}
                >
                  <Text style={{ color: sel ? colors.brand : colors.inkMuted, fontSize: 11, fontWeight: "600" }}>{m}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.atualCard, { borderColor: colors.brand, backgroundColor: colors.brand + "22" }]}>
            <Text style={[styles.opcaoNome, { color: colors.ink }]} numberOfLines={1}>{atual.nome}</Text>
            <Text style={[styles.opcaoInfo, { color: colors.inkMuted }]}>Atual · {atual.series}×{atual.reps}</Text>
          </View>

          <ScrollView style={{ maxHeight: 320 }}>
            {opcoes.map((opcao) => (
              <Pressable
                key={opcao.id}
                onPress={() => onEscolher(opcao.id, motivo)}
                style={[styles.opcaoCard, { borderColor: colors.line, backgroundColor: colors.bg }]}
              >
                <Text style={[styles.opcaoNome, { color: colors.ink }]} numberOfLines={1}>{opcao.nome}</Text>
                <Text style={[styles.opcaoInfo, { color: colors.inkMuted }]}>{atual.series}×{atual.reps}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32, maxHeight: "85%" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  title: { fontSize: 17, fontWeight: "700" },
  hint: { fontSize: 12, marginBottom: 10, lineHeight: 17 },
  motivoLabel: { fontSize: 11, fontWeight: "700", marginTop: 6, marginBottom: 6 },
  motivos: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  motivoChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  atualCard: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
  opcaoCard: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
  opcaoNome: { fontSize: 13, fontWeight: "600" },
  opcaoInfo: { fontSize: 11, marginTop: 2 },
});
