import { Component, type ReactNode } from "react";
import { Text, View } from "react-native";
import { colors } from "./theme";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: "center" }}>
          <Text style={{ color: colors.danger, fontWeight: "700", marginBottom: 8 }}>Erro ao carregar o app</Text>
          <Text style={{ color: colors.ink }}>{this.state.error.message}</Text>
          <Text style={{ color: colors.inkFaint, marginTop: 12, fontSize: 12 }}>{this.state.error.stack}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}
