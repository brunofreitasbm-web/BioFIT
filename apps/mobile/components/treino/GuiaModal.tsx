import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import { toISODate } from "../../lib/treino/program";
import { getDataInicio, setDataInicio } from "../../lib/treino/storage";

export function dataInicioPadrao(): string {
  return toISODate(new Date());
}

const SECOES: { titulo: string; texto: string }[] = [
  {
    titulo: "Estrutura",
    texto:
      "Push / Pull / Legs 2x por semana (Seg-Sáb, Dom off). Fase: manutenção/recomposição. A sessão de academia é 100% musculação: 6 exercícios; os compostos principais têm 4 séries, os demais 3 (panturrilha 4). O bloco postural NÃO ocupa tempo de academia — é feito em casa.",
  },
  {
    titulo: "Orçamento de tempo real",
    texto:
      "PUSH ~54 min · PULL ~57 min · LEGS ~57 min. No limite dos 60 min: se precisar cortar, corte primeiro o 6º exercício, depois a 4ª série do composto do slot 1 — nunca os slots diretos de postura (face pull, Y-raise, crucifixo inverso, remadas).",
  },
  {
    titulo: "Banco de exercícios (sem troca automática)",
    texto:
      "Os 24 exercícios que existiam nos antigos blocos de 15 dias viraram um banco de opções por posição (slot). Você troca um exercício quando decidir (estagnação, dor, falta de equipamento), nunca por calendário, e a troca fica registrada no Log de Trocas.",
  },
  {
    titulo: "Progressão de RIR (contínua)",
    texto:
      "Sessões 1-2 de um exercício novo (ou recém-trocado) = RIR 2-3; sessões 3-6 = RIR 2; sessão 7 em diante = RIR 1 (isoladores podem ir à falha; compostos param em RIR 1). Ao trocar um exercício, só a progressão DAQUELE exercício reinicia.",
  },
  {
    titulo: "Progressão de carga",
    texto:
      "Ao fechar o topo da faixa de reps no RIR alvo em todas as séries, suba 2,5% (superiores) ou 5% (inferiores) na sessão seguinte. Ao trocar um exercício, comece com carga conservadora (RIR 3-4 na 1ª sessão).",
  },
  {
    titulo: "Deload",
    texto:
      "A cada 8 semanas corridas — 1 semana de deload: metade das séries, RIR 4, cargas atuais reduzidas em 10%. Depois o ciclo de 8 semanas recomeça.",
  },
  {
    titulo: "Papel postural",
    texto:
      "DIRETO (retratores escapulares, trapézio inferior, extensores torácicos), INDIRETO (mecanismo secundário) ou NEUTRO (não serve à postura — só não reforçar o padrão errado). PULL concentra a maior parte dos exercícios diretos (4 de 6).",
  },
  {
    titulo: "Cardio Zona 2",
    texto: "2-3x/semana, 30-40 min a 60-70% FCmáx, nos dias de PUSH e/ou domingo — longe dos dias de perna.",
  },
];

export function GuiaModal({ dataInicio, onDataInicioChange }: { dataInicio: string; onDataInicioChange: (iso: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [inputData, setInputData] = useState(dataInicio);

  function salvar() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inputData)) return;
    setDataInicio(inputData);
    onDataInicioChange(inputData);
    setAberto(false);
  }

  return (
    <>
      <Pressable
        onPress={() => {
          setInputData(getDataInicio() ?? dataInicio);
          setAberto(true);
        }}
        style={[styles.iconBtn, { borderColor: colors.line, backgroundColor: colors.card }]}
      >
        <Ionicons name="information-circle-outline" size={20} color={colors.inkMuted} />
      </Pressable>

      <Modal visible={aberto} animationType="slide" transparent onRequestClose={() => setAberto(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAberto(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: colors.ink }]}>Guia do programa</Text>
              <Pressable onPress={() => setAberto(false)} hitSlop={12}>
                <Ionicons name="close" size={20} color={colors.inkMuted} />
              </Pressable>
            </View>

            <ScrollView>
              <View style={[styles.dataCard, { borderColor: colors.line, backgroundColor: colors.bg }]}>
                <Text style={[styles.dataTitle, { color: colors.ink }]}>Início do programa</Text>
                <Text style={[styles.dataHint, { color: colors.inkMuted }]}>Formato AAAA-MM-DD. Define semana e deload.</Text>
                <View style={styles.dataRow}>
                  <TextInput
                    value={inputData}
                    onChangeText={setInputData}
                    placeholder="2026-01-01"
                    placeholderTextColor={colors.inkFaint}
                    style={[styles.dataInput, { borderColor: colors.line, color: colors.ink }]}
                  />
                  <Pressable onPress={salvar} style={[styles.salvarBtn, { backgroundColor: colors.brand }]}>
                    <Text style={styles.salvarText}>Salvar</Text>
                  </Pressable>
                </View>
              </View>

              {SECOES.map((s) => (
                <View key={s.titulo} style={styles.secao}>
                  <Text style={[styles.secaoTitulo, { color: colors.ink }]}>{s.titulo}</Text>
                  <Text style={[styles.secaoTexto, { color: colors.inkMuted }]}>{s.texto}</Text>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 24, maxHeight: "85%" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 17, fontWeight: "700" },
  dataCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  dataTitle: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  dataHint: { fontSize: 11, marginBottom: 8 },
  dataRow: { flexDirection: "row", gap: 8 },
  dataInput: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  salvarBtn: { borderRadius: 8, paddingHorizontal: 14, justifyContent: "center" },
  salvarText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  secao: { marginBottom: 14 },
  secaoTitulo: { fontSize: 13, fontWeight: "700", marginBottom: 3 },
  secaoTexto: { fontSize: 12, lineHeight: 18 },
});
