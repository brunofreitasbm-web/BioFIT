import { StyleSheet, Text, View } from "react-native";
import type { GrupoMuscular } from "../../lib/treino/tipos";

// Cores por grupo muscular no tema escuro do app: pill de fundo saturado + texto branco,
// mais simples de garantir contraste do que replicar o par claro/escuro do app web.
const GRUPO_COR: Record<GrupoMuscular, string> = {
  Peito: "#c2410c",
  Costas: "#a16207",
  Deltoides: "#0f766e",
  "Bíceps": "#5b21b6",
  "Tríceps": "#a21caf",
  "Quadríceps": "#0369a1",
  Posterior: "#6d28d9",
  Panturrilha: "#15803d",
  Postura: "#be185d",
  Core: "#b45309",
};

export function GrupoBadge({ grupo }: { grupo: GrupoMuscular }) {
  return (
    <View style={[styles.badge, { backgroundColor: GRUPO_COR[grupo] }]}>
      <Text style={styles.text}>{grupo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  text: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
