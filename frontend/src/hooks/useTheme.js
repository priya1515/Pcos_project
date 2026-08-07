import { useEffect, useState } from "react";

const STORAGE_KEY = "femwell-theme";

export function useTheme() {
  const [theme, setTheme] = useState(() => window.localStorage.getItem(STORAGE_KEY) || "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return { theme, setTheme };
}
