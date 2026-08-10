import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { getToken, clearToken, api } from "./lib/api";
import { LoginScreen } from "./screens/LoginScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { ProgressoScreen } from "./screens/ProgressoScreen";
import { DesafioScreen } from "./screens/DesafioScreen";
import { PagamentosScreen } from "./screens/PagamentosScreen";
import { PerfilScreen } from "./screens/PerfilScreen";
import { TabBar, type TabDef } from "./components/TabBar";
import { ErrorBoundary } from "./ErrorBoundary";
import { ThemeProvider, useAppTheme } from "./lib/themeContext";

const TABS: TabDef[] = [
  { key: "treino", label: "Treino", icon: "🏋" },
  { key: "progresso", label: "Progresso", icon: "📈" },
  { key: "desafio", label: "Desafio", icon: "🏆" },
  { key: "pagamentos", label: "Pagar", icon: "💳" },
  { key: "perfil", label: "Perfil", icon: "👤" },
];

function MainTabs({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState("treino");
  const { colors } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        {activeTab === "treino" && <HomeScreen />}
        {activeTab === "progresso" && <ProgressoScreen />}
        {activeTab === "desafio" && <DesafioScreen />}
        {activeTab === "pagamentos" && <PagamentosScreen />}
        {activeTab === "perfil" && <PerfilScreen onLogout={onLogout} />}
      </View>
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
    </View>
  );
}

function App() {
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const { colors, refreshUserInfo, updateUserInfo } = useAppTheme();

  useEffect(() => {
    getToken().then((token) => {
      setLoggedIn(!!token);
      if (token) {
        refreshUserInfo().finally(() => setChecking(false));
      } else {
        setChecking(false);
      }
    });
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {loggedIn ? (
        <MainTabs onLogout={() => {
          clearToken().then(() => {
            updateUserInfo(null);
            setLoggedIn(false);
          });
        }} />
      ) : (
        <LoginScreen onLoggedIn={() => {
          setLoggedIn(true);
          refreshUserInfo();
        }} />
      )}
    </>
  );
}

export default function AppRoot() {
  return (
    <ErrorBoundary>
      <ThemeProvider apiFetch={api}>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
