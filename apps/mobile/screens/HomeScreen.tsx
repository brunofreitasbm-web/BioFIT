import { useEffect, useMemo, useState } from "react";
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

function LogSerieRow({
  item,
  bloco,
  isCurrent,
  done,
  onLogged,
  onRegisterQuickLog,
}: {
  item: BlocoItem;
  bloco: BlocoTreino;
  isCurrent: boolean;
  done: boolean;
  onLogged: (itemId: string, isPR: boolean) => void;
  onRegisterQuickLog: (itemId: string, fn: () => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [rodada, setRodada] = useState("1");
  const [carga, setCarga] = useState(item.cargaKg ? String(item.cargaKg) : "");
  const [reps, setReps] = useState("");
  const [saving, setSaving] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [justPR, setJustPR] = useState(false);
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
      setJustPR(execucao.isPR);
      setOpen(false);
      onLogged(item.id, execucao.isPR);
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

  useEffect(() => {
    onRegisterQuickLog(item.id, handleQuickLog);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.cargaKg]);

  const totalDots = Math.max(bloco.rounds, 1);
  const filledDots = done ? totalDots : 0;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: isCurrent ? colors.accent : colors.line },
        isCurrent && styles.cardCurrent,
      ]}
    >
      <View style={styles.cardHeaderRow}>
        <Pressable onPress={() => setOpen((v) => !v)} style={styles.cardHeaderText}>
          <Text style={[styles.itemName, { color: colors.ink }]}>{item.exercicio.nome}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.itemMeta, { color: colors.inkMuted }]}>
              {bloco.rounds}×{item.repeticoesAlvo}
              {item.cargaKg ? ` · ${item.cargaKg}kg` : ""}
            </Text>
            {isCurrent && <Text style={[styles.itemMeta, { color: colors.inkFaint }]}> · série atual</Text>}
          </View>
        </Pressable>

        <View style={styles.dotsRow}>
          {Array.from({ length: totalDots }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i < filledDots ? colors.accent : colors.line },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.actionButtons}>
        <Pressable style={[styles.mapToggleBtn, { borderColor: colors.line }]} onPress={() => setShowMap((v) => !v)}>
          <Text style={{ fontSize: 12, color: colors.inkMuted }}>💪 Map</Text>
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

      {showMap && <MuscleMap grupoMuscular={item.exercicio.grupoMuscular} colors={colors} />}

      {justPR && (
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
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const { colors, userInfo, refreshUserInfo } = useAppTheme();

  useEffect(() => {
    api<Ficha | null>("/fichas/minha")
      .then((f) => {
        setFicha(f);
        setDoneIds(new Set());
      })
      .catch(() => setFicha(null));
  }, []);

  const flatItems = useMemo(() => {
    if (!ficha) return [];
    return ficha.blocos
      .sort((a, b) => a.rounds - b.rounds)
      .flatMap((bloco) =>
        bloco.itens.sort((a, b) => a.ordem - b.ordem).map((item) => ({ bloco, item })),
      );
  }, [ficha]);

  const currentIndex = flatItems.findIndex(({ item }) => !doneIds.has(item.id));
  const currentItemId = currentIndex >= 0 ? flatItems[currentIndex].item.id : null;

  const total = flatItems.length;
  const progress = total > 0 ? doneIds.size / total : 0;

  function handleLogged(itemId: string) {
    setDoneIds((prev) => new Set(prev).add(itemId));
    refreshUserInfo();
  }

  const quickLogActions = useMemo(() => new Map<string, () => void>(), [ficha]);
  function registerQuickLog(itemId: string, fn: () => void) {
    quickLogActions.set(itemId, fn);
  }

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
          <View style={[styles.streakContainer, { borderColor: colors.accent }]}>
            <Text style={[styles.streakText, { color: colors.accent }]}>🔥 {userInfo.streak} Dias Seguidos</Text>
          </View>
        )}
      </View>

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
        <>
          <View style={styles.fichaHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fichaTitulo, { color: colors.ink }]}>{ficha.titulo}</Text>
              <Text style={[styles.fichaSemana, { color: colors.inkMuted }]}>
                Semana {ficha.semana} · séries {doneIds.size} de {total}
              </Text>
            </View>
            <Text style={[styles.fichaPercent, { color: colors.accent }]}>{Math.round(progress * 100)}%</Text>
          </View>
          <View style={[styles.fichaProgressBg, { backgroundColor: colors.line }]}>
            <View style={[styles.fichaProgressFill, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: currentItemId ? 96 : 16 }}>
            {flatItems.map(({ bloco, item }) => (
              <LogSerieRow
                key={item.id}
                item={item}
                bloco={bloco}
                isCurrent={item.id === currentItemId}
                done={doneIds.has(item.id)}
                onLogged={handleLogged}
                onRegisterQuickLog={registerQuickLog}
              />
            ))}
          </ScrollView>

          {currentItemId && (
            <Pressable
              style={[styles.fixedCta, { backgroundColor: colors.accent }]}
              onPress={() => quickLogActions.get(currentItemId)?.()}
            >
              <Text style={styles.fixedCtaText}>toque para confirmar série</Text>
            </Pressable>
          )}
        </>
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
    backgroundColor: "transparent",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  streakText: {
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
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  fichaTitulo: { fontSize: 24, fontWeight: "800" },
  fichaSemana: { fontSize: 13, marginTop: 2 },
  fichaPercent: { fontSize: 18, fontWeight: "800" },
  fichaProgressBg: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    marginHorizontal: 16,
    marginTop: 10,
  },
  fichaProgressFill: { height: "100%" },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardCurrent: {
    borderWidth: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardHeaderText: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "700" },
  metaRow: { flexDirection: "row", marginTop: 3 },
  itemMeta: { fontSize: 12 },
  dotsRow: { flexDirection: "row", gap: 4, marginTop: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
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
  prBanner: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  prBannerText: { color: "#0a0b0f", fontWeight: "700", fontSize: 12, textAlign: "center" },
  logForm: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
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
  fixedCta: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  fixedCtaText: { color: "#0a0b0f", fontWeight: "800", fontSize: 15 },
});
