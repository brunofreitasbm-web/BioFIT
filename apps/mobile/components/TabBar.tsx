import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../lib/themeContext";

export interface TabDef {
  key: string;
  label: string;
  icon: string;
}

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.bar, { borderTopColor: colors.line, backgroundColor: colors.bg }]}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable key={tab.key} style={styles.tab} onPress={() => onChange(tab.key)}>
            <Text style={[styles.icon, isActive && styles.iconActive]}>{tab.icon}</Text>
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
  icon: { fontSize: 18, opacity: 0.5 },
  iconActive: { opacity: 1 },
  label: { fontSize: 11 },
  labelActive: { fontWeight: "600" },
});
