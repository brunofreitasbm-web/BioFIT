import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

export interface TabDef {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export function TabBarIcons({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={[styles.bar, { borderTopColor: colors.line, backgroundColor: colors.bg }]}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable key={tab.key} style={styles.tab} onPress={() => onChange(tab.key)}>
            <Ionicons name={tab.icon} size={22} color={isActive ? colors.brand : colors.inkFaint} />
            <Text style={[styles.label, { color: isActive ? colors.ink : colors.inkFaint }, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tab: { flex: 1, alignItems: "center", gap: 2 },
  label: { fontSize: 11 },
  labelActive: { fontWeight: "600" },
});
