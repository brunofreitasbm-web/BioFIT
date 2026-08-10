import React from "react";
import { View, StyleSheet, Text } from "react-native";
import Svg, { Path, G, Circle } from "react-native-svg";

interface MuscleMapProps {
  grupoMuscular: string;
  colors: {
    brand: string;
    accent: string;
    line: string;
    inkMuted: string;
  };
}

export function MuscleMap({ grupoMuscular, colors }: MuscleMapProps) {
  // Determinar se o grupo é frontal ou traseiro para destacar a silhueta correspondente
  const g = (grupoMuscular || "").toUpperCase();

  const isFront = ["PEITO", "ABDOMEN", "QUADRICEPS", "BICEPS", "ANTEBRACO", "CARDIO"].includes(g);
  const isBack = ["COSTAS", "TRICEPS", "GLUTEO", "POSTERIOR_COXA"].includes(g);
  const isBoth = ["OMBRO", "PANTURRILHA"].includes(g);

  const getMuscleColor = (muscle: string) => {
    if (g === muscle) return colors.accent; // Cor de destaque para o músculo primário
    // Músculos secundários / sinergistas
    if (g === "PEITO" && ["OMBRO", "TRICEPS"].includes(muscle)) return colors.brand;
    if (g === "COSTAS" && ["BICEPS", "ANTEBRACO"].includes(muscle)) return colors.brand;
    if (g === "QUADRICEPS" && ["GLUTEO", "PANTURRILHA"].includes(muscle)) return colors.brand;
    if (g === "GLUTEO" && ["POSTERIOR_COXA", "QUADRICEPS"].includes(muscle)) return colors.brand;
    return "#3a3f4d"; // Cor padrão (não focado)
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.inkMuted }]}>
        Músculos Alvo: <Text style={{ color: colors.accent, fontWeight: "700" }}>{g}</Text>
      </Text>

      <View style={styles.bodies}>
        {/* Vista Frontal */}
        <View style={styles.bodyContainer}>
          <Text style={[styles.bodyLabel, { color: colors.inkMuted }]}>Frente</Text>
          <Svg width="100" height="180" viewBox="0 0 100 200">
            {/* Cabeça */}
            <Circle cx="50" cy="20" r="12" fill="#2c313c" />
            {/* Pescoço */}
            <Path d="M46,32 L54,32 L54,38 L46,38 Z" fill="#2c313c" />
            
            {/* Ombros */}
            <Path d="M30,42 Q50,38 70,42 L66,54 Q50,48 34,54 Z" fill={getMuscleColor("OMBRO")} />

            {/* Peito */}
            <Path d="M35,55 L65,55 L63,78 L37,78 Z" fill={getMuscleColor("PEITO")} />
            {/* Coração / Cardio */}
            {g === "CARDIO" && (
              <Circle cx="45" cy="65" r="5" fill={colors.accent} />
            )}

            {/* Abdômen */}
            <Path d="M37,80 L63,80 L60,110 L40,110 Z" fill={getMuscleColor("ABDOMEN")} />

            {/* Braço Direito (Bíceps e Antebraço) */}
            <G>
              {/* Biceps */}
              <Path d="M28,48 L34,54 L28,78 L20,72 Z" fill={getMuscleColor("BICEPS")} />
              {/* Antebraço */}
              <Path d="M20,74 L28,80 L18,110 L12,105 Z" fill={getMuscleColor("ANTEBRACO")} />
            </G>

            {/* Braço Esquerdo (Bíceps e Antebraço) */}
            <G>
              {/* Biceps */}
              <Path d="M72,48 L66,54 L72,78 L80,72 Z" fill={getMuscleColor("BICEPS")} />
              {/* Antebraço */}
              <Path d="M80,74 L72,80 L82,110 L88,105 Z" fill={getMuscleColor("ANTEBRACO")} />
            </G>

            {/* Quadríceps (Coxa Frente) */}
            <G>
              {/* Direita */}
              <Path d="M35,115 L48,115 L45,155 L32,155 Z" fill={getMuscleColor("QUADRICEPS")} />
              {/* Esquerda */}
              <Path d="M52,115 L65,115 L68,155 L55,155 Z" fill={getMuscleColor("QUADRICEPS")} />
            </G>

            {/* Panturrilhas (Frente) */}
            <G>
              {/* Direita */}
              <Path d="M32,160 L44,160 L40,195 L34,195 Z" fill={getMuscleColor("PANTURRILHA")} />
              {/* Esquerda */}
              <Path d="M56,160 L68,160 L66,195 L60,195 Z" fill={getMuscleColor("PANTURRILHA")} />
            </G>
          </Svg>
        </View>

        {/* Vista Traseira */}
        <View style={styles.bodyContainer}>
          <Text style={[styles.bodyLabel, { color: colors.inkMuted }]}>Costas</Text>
          <Svg width="100" height="180" viewBox="0 0 100 200">
            {/* Cabeça */}
            <Circle cx="50" cy="20" r="12" fill="#2c313c" />
            {/* Pescoço */}
            <Path d="M46,32 L54,32 L54,38 L46,38 Z" fill="#2c313c" />
            
            {/* Ombros posterior */}
            <Path d="M30,42 Q50,38 70,42 L66,54 Q50,48 34,54 Z" fill={getMuscleColor("OMBRO")} />

            {/* Costas (Dorsal / Trapézio) */}
            <Path d="M35,55 L65,55 L61,105 L39,105 Z" fill={getMuscleColor("COSTAS")} />

            {/* Tríceps (Braço Traseiro) */}
            <G>
              {/* Direita */}
              <Path d="M28,48 L34,54 L26,78 L18,72 Z" fill={getMuscleColor("TRICEPS")} />
              {/* Esquerda */}
              <Path d="M72,48 L66,54 L74,78 L82,72 Z" fill={getMuscleColor("TRICEPS")} />
            </G>

            {/* Glúteo */}
            <Path d="M36,108 L64,108 L66,128 L34,128 Z" fill={getMuscleColor("GLUTEO")} />

            {/* Posterior de Coxa */}
            <G>
              {/* Direita */}
              <Path d="M34,130 L48,130 L45,165 L32,165 Z" fill={getMuscleColor("POSTERIOR_COXA")} />
              {/* Esquerda */}
              <Path d="M52,130 L66,130 L68,165 L55,165 Z" fill={getMuscleColor("POSTERIOR_COXA")} />
            </G>

            {/* Panturrilhas (Costas) */}
            <G>
              {/* Direita */}
              <Path d="M32,170 L44,170 L40,195 L34,195 Z" fill={getMuscleColor("PANTURRILHA")} />
              {/* Esquerda */}
              <Path d="M56,170 L68,170 L66,195 L60,195 Z" fill={getMuscleColor("PANTURRILHA")} />
            </G>
          </Svg>
        </View>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.accent }]} />
          <Text style={[styles.legendText, { color: colors.inkMuted }]}>Primário</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.brand }]} />
          <Text style={[styles.legendText, { color: colors.inkMuted }]}>Secundário</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#171a20",
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2c313c",
  },
  title: {
    fontSize: 12,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bodies: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  bodyContainer: {
    alignItems: "center",
  },
  bodyLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 4,
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 10,
  },
});
