import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import { getBikeIndoor, removerBikeIndoor, saveBikeIndoor } from "../../lib/treino/storage";

const PRESETS = [15, 30, 45, 60];

export function BikeIndoorCard({ hojeISO }: { hojeISO: string }) {
  const [tempo, setTempo] = useState("30");
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const reg = getBikeIndoor(hojeISO);
    if (reg) {
      setTempo(reg.tempoMinutos.toString());
      setConcluido(reg.concluido);
    } else {
      setTempo("30");
      setConcluido(false);
    }
  }, [hojeISO]);

  function handleCheckToggle() {
    const numTempo = parseInt(tempo, 10);
    if (isNaN(numTempo) || numTempo <= 0) {
      setErro("Insira um tempo válido em minutos (ex: 30)");
      return;
    }
    const novoStatus = !concluido;
    const salvou = novoStatus
      ? saveBikeIndoor({ data: hojeISO, tempoMinutos: numTempo, concluido: true, registradoEm: new Date().toISOString() })
      : removerBikeIndoor(hojeISO);
    if (!salvou) {
      setErro("Não foi possível salvar no dispositivo. Tente novamente.");
      return;
    }
    setErro(null);
    setConcluido(novoStatus);
  }

  function handlePreset(m: number) {
    setTempo(m.toString());
    setErro(null);
    if (concluido) {
      saveBikeIndoor({ data: hojeISO, tempoMinutos: m, concluido: true, registradoEm: new Date().toISOString() });
    }
  }

  return (
    <View style={[styles.card, { borderColor: concluido ? colors.accent : colors.line, backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: concluido ? colors.accent : colors.bg }]}>
          <Ionicons name="bicycle" size={18} color={concluido ? "#fff" : colors.inkMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.ink }]}>Bike Indoor</Text>
            <View style={[styles.tag, { backgroundColor: concluido ? colors.accent + "33" : colors.bg }]}>
              <Text style={[styles.tagText, { color: concluido ? colors.accent : colors.inkFaint }]}>
                {concluido ? "Concluído" : "Cardio"}
              </Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            {concluido ? `Sessão de ${tempo} min finalizada!` : "Informe a duração e faça o check"}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={[styles.durInput, { borderColor: colors.line }]}>
          <Text style={styles.durLabel}>Duração:</Text>
          <TextInput
            value={tempo}
            onChangeText={(v) => {
              setTempo(v);
              setErro(null);
            }}
            keyboardType="number-pad"
            placeholder="30"
            placeholderTextColor={colors.inkFaint}
            style={[styles.durValue, { color: colors.ink }]}
          />
          <Text style={styles.durLabel}>min</Text>
        </View>
        <View style={styles.presets}>
          {PRESETS.map((m) => {
            const selecionado = tempo === m.toString();
            return (
              <Pressable
                key={m}
                onPress={() => handlePreset(m)}
                style={[styles.presetBtn, { borderColor: selecionado ? colors.brand : colors.line, backgroundColor: selecionado ? colors.brand + "22" : colors.bg }]}
              >
                <Text style={{ color: selecionado ? colors.brand : colors.inkMuted, fontSize: 12, fontWeight: "600" }}>{m}m</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {erro && <Text style={[styles.erro, { color: colors.danger }]}>{erro}</Text>}

      <Pressable
        onPress={handleCheckToggle}
        disabled={!tempo || parseInt(tempo, 10) <= 0}
        style={[styles.confirmBtn, { backgroundColor: concluido ? colors.accent : colors.brand }]}
      >
        <Ionicons name={concluido ? "checkmark" : "ellipse-outline"} size={16} color="#fff" />
        <Text style={styles.confirmText}>{concluido ? `Concluído (${tempo} min)` : "Marcar como Concluído"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 },
  header: { flexDirection: "row", gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 14, fontWeight: "700" },
  tag: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
  tagText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  subtitle: { fontSize: 12, marginTop: 2 },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  durInput: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  durLabel: { color: colors.inkFaint, fontSize: 12 },
  durValue: { fontSize: 14, fontWeight: "700", width: 32, textAlign: "center", padding: 0 },
  presets: { flexDirection: "row", gap: 6 },
  presetBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  erro: { fontSize: 11, fontWeight: "600", marginTop: 8 },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 11, marginTop: 12 },
  confirmText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
