import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { useAppTheme } from "../lib/themeContext";
import { MuscleMap } from "../components/MuscleMap";

interface Exercicio {
  id: string;
  nome: string;
  grupoMuscular: string;
}

interface BlocoItem {
  id: string;
  ordem: number;
  repeticoesAlvo: string;
  cargaKg: number | null;
  exercicio: Exercicio;
}

interface BlocoTreino {
  id: string;
  tipo: string;
  nome: string | null;
  rounds: number;
  descansoSegundos: number;
  itens: BlocoItem[];
}

interface Ficha {
  id: string;
  titulo: string;
  semana: number;
  blocos: BlocoTreino[];
}

const TIPO_LABEL: Record<string, string> = {
  AQUECIMENTO: "Aquecimento",
  SIMPLES: "Simples",
  BI_SET: "Bi-set",
  TRI_SET: "Tri-set",
  CIRCUITO: "Circuito",
};

function LogSerieRow({ item, onLogged }: { item: BlocoItem; onLogged: () => void }) {
  const [open, setOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [rodada, setRodada] = useState("1");
  const [carga, setCarga] = useState(item.cargaKg ? String(item.cargaKg) : "");
  const [reps, setReps] = useState("");
  const [saving, setSaving] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [isPR, setIsPR] = useState(false);
  const { colors } = useAppTheme();

  async function registrar(r: string, c: string, rp: string, isQuick = false) {
    if (isQuick) setQuickSaving(true);
    else setSaving(true);
    try {
      const execucao = await api<{ isPR: boolean }>("/execucoes", {
        method: "POST",
        body: {
          blocoItemId: item.id,
          rodada: Number(r),
          cargaKg: Number(c || 0),
          repeticoes: Number(rp || 10),
        },
      });
      setDone(true);
      setIsPR(execucao.isPR);
      setOpen(false);
      onLogged();
    } catch {
      // silently ignore for this MVP
    } finally {
      setSaving(false);
      setQuickSaving(false);
    }
  }

  // Quick Log: utiliza o peso alvo e assume repetições com base no alvo (ou 10 reps padrão)
  function handleQuickLog() {
    const defaultReps = item.repeticoesAlvo.includes("-") 
      ? item.repeticoesAlvo.split("-")[0] 
      : item.repeticoesAlvo.replace(/[^0-9]/g, "") || "10";
    
    registrar("1", String(item.cargaKg || 0), defaultReps, true);
  }

  return (
    <View style={[styles.item, { borderTopColor: colors.line }]}>
      <View style={styles.itemHeaderContainer}>
        <Pressable onPress={() => setOpen((v) => !v)} style={styles.itemHeader}>
          <Text style={[styles.itemName, { color: colors.ink }]}>{item.exercicio.nome}</Text>
          <Text style={styles.itemMeta}>
            {item.repeticoesAlvo} {item.cargaKg ? `· ${item.cargaKg}kg` : ""} {done ? "✓" : ""}
          </Text>
        </Pressable>

        <View style={styles.actionButtons}>
          <Pressable 
            style={[styles.mapToggleBtn, { borderColor: colors.line }]} 
            onPress={() => setShowMap((v) => !v)}
          >
            <Text style={{ fontSize: 12 }}>💪 Map</Text>
          </Pressable>

          {!done && (
            <Pressable 
              style={[styles.quickLogBtn, { backgroundColor: colors.accent }]} 
              onPress={handleQuickLog}
              disabled={quickSaving}
            >
              {quickSaving ? (
                <ActivityIndicator color="#0a0b0f" size="small" />
              ) : (
                <Text style={styles.quickLogBtnText}>Quick ✓</Text>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {showMap && (
        <MuscleMap grupoMuscular={item.exercicio.grupoMuscular} colors={colors} />
      )}

      {isPR && (
        <View style={[styles.prBanner, { backgroundColor: colors.accent }]}>
          <Text style={styles.prBannerText}>🏆 Novo recorde neste exercício!</Text>
        </View>
      )}

      {open && (
        <View style={styles.logForm}>
          <TextInput
            value={rodada}
            onChangeText={setRodada}
            keyboardType="numeric"
            placeholder="Rodada"
            placeholderTextColor={colors.inkFaint}
            style={[styles.logInput, { backgroundColor: colors.bg, borderColor: colors.line, color: colors.ink }]}
          />
          <TextInput
            value={carga}
            onChangeText={setCarga}
            keyboardType="numeric"
            placeholder="Carga (kg)"
            placeholderTextColor={colors.inkFaint}
            style={[styles.logInput, { backgroundColor: colors.bg, borderColor: colors.line, color: colors.ink }]}
          />
          <TextInput
            value={reps}
            onChangeText={setReps}
            keyboardType="numeric"
            placeholder="Reps"
            placeholderTextColor={colors.inkFaint}
            style={[styles.logInput, { backgroundColor: colors.bg, borderColor: colors.line, color: colors.ink }]}
          />
          <Pressable 
            style={[styles.logButton, { backgroundColor: colors.accent }]} 
            onPress={() => registrar(rodada, carga, reps)} 
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#0a0b0f" size="small" /> : <Text style={styles.logButtonText}>Registrar</Text>}
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function HomeScreen() {
  const [ficha, setFicha] = useState<Ficha | null | undefined>(undefined);
  const { colors, userInfo, refreshUserInfo } = useAppTheme();

  useEffect(() => {
    api<Ficha | null>("/fichas/minha")
      .then(setFicha)
      .catch(() => setFicha(null));
  }, []);

  // Gamification Level calculations
  const xp = userInfo?.xp ?? 0;
  const level = Math.floor(xp / 100) + 1;
  const xpInCurrentLevel = xp % 100;
  const xpProgress = xpInCurrentLevel / 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.topbar, { borderBottomColor: colors.line }]}>
        <Text style={[styles.brand, { color: colors.ink }]}>
          {userInfo?.branding?.brandName || "BioFIT"}
        </Text>
        {userInfo?.streak !== undefined && userInfo.streak > 0 && (
          <View style={styles.streakContainer}>
            <Text style={styles.streakText}>🔥 {userInfo.streak} Dias Seguidos</Text>
          </View>
        )}
      </View>

      {/* Gamification Header */}
      {userInfo && (
        <View style={[styles.gameHeader, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <View style={styles.gameRow}>
            <View>
              <Text style={[styles.userName, { color: colors.ink }]}>Olá, {userInfo.nome}!</Text>
              <Text style={{ color: colors.inkMuted, fontSize: 11 }}>Nível {level} • {xp} XP total</Text>
            </View>
            <View style={[styles.levelBadge, { backgroundColor: colors.brand }]}>
              <Text style={styles.levelBadgeText}>Lvl {level}</Text>
            </View>
          </View>
          {/* XP Progress Bar */}
          <View style={[styles.progressBarBg, { backgroundColor: colors.line }]}>
            <View style={[styles.progressBarFill, { backgroundColor: colors.accent, width: `${xpProgress * 100}%` }]} />
          </View>
        </View>
      )}

      {ficha === undefined && <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} />}

      {ficha === null && (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.ink }]}>Nenhuma ficha ativa no momento.</Text>
          <Text style={[styles.emptySub, { color: colors.inkMuted }]}>Fale com seu personal trainer.</Text>
        </View>
      )}

      {ficha && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.fichaHeader}>
            <View>
              <Text style={[styles.fichaTitulo, { color: colors.ink }]}>{ficha.titulo}</Text>
              <Text style={[styles.fichaSemana, { color: colors.inkMuted }]}>Semana {ficha.semana}</Text>
            </View>
          </View>

          {ficha.blocos
            .sort((a, b) => a.rounds - b.rounds)
            .map((bloco) => (
              <View key={bloco.id} style={[styles.bloco, { backgroundColor: colors.card, borderColor: colors.line }]}>
                <View style={styles.blocoHeader}>
                  <Text style={[styles.blocoTipo, { color: colors.accent }]}>
                    {TIPO_LABEL[bloco.tipo] ?? bloco.tipo}
                  </Text>
                  <Text style={[styles.blocoMeta, { color: colors.inkFaint }]}>
                    {bloco.rounds}x · descanso {bloco.descansoSegundos}s
                  </Text>
                </View>
                {bloco.itens
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((item) => (
                    <LogSerieRow key={item.id} item={item} onLogged={refreshUserInfo} />
                  ))}
              </View>
            ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  brand: { fontWeight: "700", fontSize: 16 },
  streakContainer: {
    backgroundColor: "#ffeb3b20",
    borderColor: "#fbc02d",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  streakText: {
    color: "#ffd54f",
    fontSize: 11,
    fontWeight: "700",
  },
  gameHeader: {
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  gameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
  },
  levelBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  levelBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
  },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 24 },
  emptyText: { fontSize: 15, fontWeight: "600" },
  emptySub: { fontSize: 13, marginTop: 4 },
  fichaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  fichaTitulo: { fontSize: 20, fontWeight: "700" },
  fichaSemana: { fontSize: 13, marginBottom: 16 },
  bloco: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  prBanner: {
    marginTop: 6,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  prBannerText: { color: "#0a0b0f", fontWeight: "700", fontSize: 12, textAlign: "center" },
  blocoHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  blocoTipo: { fontWeight: "700", fontSize: 13 },
  blocoMeta: { fontSize: 12 },
  item: { paddingVertical: 8, borderTopWidth: 1 },
  itemHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemHeader: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: "500" },
  itemMeta: { color: "#9aa0ac", fontSize: 12 },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mapToggleBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  quickLogBtn: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  quickLogBtnText: {
    color: "#0a0b0f",
    fontWeight: "700",
    fontSize: 11,
  },
  logForm: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  logInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    width: 90,
    fontSize: 13,
  },
  logButton: {
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  logButtonText: { color: "#0a0b0f", fontWeight: "700", fontSize: 13 },
});
