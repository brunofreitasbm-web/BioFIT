import React, { createContext, useContext, useState } from "react";
import { colors as defaultColors } from "../theme";

export interface Branding {
  brandColor: string;
  brandAccent: string;
  brandName: string;
}

interface UserInfo {
  id: string;
  nome: string;
  email: string;
  role: string;
  xp: number;
  streak: number;
  branding?: Branding;
}

interface ThemeContextType {
  colors: typeof defaultColors;
  userInfo: UserInfo | null;
  updateUserInfo: (info: UserInfo | null) => void;
  refreshUserInfo: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, apiFetch }: { children: React.ReactNode; apiFetch: <T>(path: string) => Promise<T> }) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [colors, setColors] = useState(defaultColors);

  const updateUserInfo = (info: UserInfo | null) => {
    setUserInfo(info);
    if (info?.branding) {
      setColors({
        ...defaultColors,
        brand: info.branding.brandColor || defaultColors.brand,
        accent: info.branding.brandAccent || defaultColors.accent,
      });
    } else {
      setColors(defaultColors);
    }
  };

  const refreshUserInfo = async () => {
    try {
      const data = await apiFetch<UserInfo>("/me");
      updateUserInfo(data);
    } catch (e) {
      console.warn("Failed to fetch user branding:", e);
    }
  };

  return (
    <ThemeContext.Provider value={{ colors, userInfo, updateUserInfo, refreshUserInfo }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }
  return context;
}
