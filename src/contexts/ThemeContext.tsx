import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  createContext,
  useContext,
  useEffect,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type ThemeType = "SYSTEM" | "DARK" | "LIGHT";

interface ThemeValue {
  theme: ThemeType;
  setTheme: Dispatch<SetStateAction<ThemeType>>;
}

const ThemeContext = createContext<ThemeValue>({
  theme: "SYSTEM",
  setTheme: () => {},
});

const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useLocalStorage<ThemeValue["theme"]>(
    "SYSTEM",
    "theme"
  );

  const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
  const isSystemDark = darkThemeMq.matches;

  const isUserThemeDark =
    theme === "DARK" || (theme === "SYSTEM" && isSystemDark);

  useEffect(() => {
    const doc = document.documentElement;

    const classList = doc.classList;

    if (classList.contains("dark") && !isUserThemeDark)
      classList.remove("dark");
    if (!classList.contains("dark") && isUserThemeDark) classList.add("dark");
  }, [theme, isUserThemeDark]);
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!ThemeContext)
    throw new Error("useTheme used outside themeContext scope");
  return context;
};

export default ThemeProvider;
