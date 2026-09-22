import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "./theme";
import { ErrorBoundary } from "./ErrorBoundary";
import { hydrateStorage } from "./lib/treino/storage";
import { HojeScreen } from "./screens/treino/HojeScreen";
import { RelatorioScreen } from "./screens/treino/RelatorioScreen";
import { TabBarIcons, type TabDef } from "./components/TabBar";

const TABS: TabDef[] = [
  { key: "hoje", label: "Hoje", icon: "barbell" },
  { key: "relatorio", label: "Relatório", icon: "stats-chart" },
];

function MainTabs() {
  const [activeTab, setActiveTab] = useState("hoje");

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        {activeTab === "hoje" && <HojeScreen />}
        {activeTab === "relatorio" && <RelatorioScreen />}
      </View>
      <TabBarIcons tabs={TABS} active={activeTab} onChange={setActiveTab} />
    </View>
  );
}

function App() {
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    hydrateStorage().then(() => setPronto(true));
  }, []);

  if (!pronto) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <MainTabs />
    </>
  );
}

export default function AppRoot() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
