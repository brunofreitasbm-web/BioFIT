import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { useAppTheme } from "../lib/themeContext";

interface RankingEntry {
  alunoId: string;
  nome: string;
  volume: number;
}

interface Ranking {
  id: string;
  titulo: string;
  ranking: RankingEntry[];
}

export function DesafioScreen() {
  const [ranking, setRanking] = useState<Ranking | null | undefined>(undefined);
  const { colors } = useAppTheme();

  useEffect(() => {
    api<Ranking | null>("/desafios/ativo")
      .then(setRanking)
      .catch(() => setRanking(null));
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.topbar, { borderBottomColor: colors.line }]}>
        <Text style={[styles.brand, { color: colors.ink }]}>Desafio Gym Rats</Text>
      </View>

      {ranking === undefined && <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} />}

      {ranking === null && (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.ink }]}>Nenhum desafio ativo no momento.</Text>
          <Text style={[styles.emptySub, { color: colors.inkMuted }]}>Fale com seu personal trainer.</Text>
        </View>
      )}

      {ranking && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={[styles.titulo, { color: colors.ink }]}>{ranking.titulo}</Text>
          {ranking.ranking.map((r, i) => (
            <View 
              key={r.alunoId} 
              style={[
                styles.row, 
                { backgroundColor: colors.card, borderColor: i === 0 ? colors.accent : colors.line }
              ]}
            >
              <Text style={[styles.pos, { color: colors.inkFaint }]}>#{i + 1}</Text>
              <Text style={[styles.nome, { color: colors.ink }]}>{r.nome}</Text>
              <Text style={[styles.volume, { color: colors.accent }]}>{r.volume} kg</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topbar: { padding: 16, borderBottomWidth: 1 },
  brand: { fontWeight: "700", fontSize: 16 },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 24 },
  emptyText: { fontSize: 15, fontWeight: "600" },
  emptySub: { fontSize: 13, marginTop: 4 },
  titulo: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  pos: { fontWeight: "700", width: 28 },
  nome: { flex: 1, fontSize: 14, fontWeight: "500" },
  volume: { fontWeight: "700", fontSize: 13 },
});
