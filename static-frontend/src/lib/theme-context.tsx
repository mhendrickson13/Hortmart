import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { translations, getTranslation, type TranslationKeys } from "./translations";

type Theme = "light" | "dark" | "system";
type Language = "en" | "es" | "pt" | "fr";
type Timezone = string;

interface AppPreferences {
  theme: Theme;
  language: Language;
  timezone: Timezone;
}

interface AppPreferencesContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  language: Language;
  timezone: Timezone;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setTimezone: (timezone: Timezone) => void;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date | string) => string;
  formatDateTime: (date: Date | string) => string;
  formatRelativeTime: (date: Date | string) => string;
  t: (path: string) => string;
  translations: TranslationKeys;
}

const STORAGE_KEY = "app-preferences";

const defaultPreferences: AppPreferences = {
  theme: "system",
  language: "en",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
};

const languageNames: Record<Language, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
};

const AppPreferencesContext = createContext<AppPreferencesContextType | undefined>(
  undefined
);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [preferences, setPreferences] = useState<AppPreferences>(defaultPreferences);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Load preferences from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppPreferences>;
        setPreferences((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.error("Failed to load preferences:", e);
    }
  }, []);

  // Apply theme whenever it changes
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    let effectiveTheme: "light" | "dark";

    if (preferences.theme === "system") {
      effectiveTheme = getSystemTheme();
    } else {
      effectiveTheme = preferences.theme;
    }

    setResolvedTheme(effectiveTheme);

    // Remove both classes first, then add the correct one
    root.classList.remove("light", "dark");
    root.classList.add(effectiveTheme);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        "content",
        effectiveTheme === "dark" ? "#0f1115" : "#F6F7FB"
      );
    }
  }, [preferences.theme, mounted]);

  // Listen for system theme changes when using "system" setting
  useEffect(() => {
    if (!mounted || preferences.theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? "dark" : "light";
      setResolvedTheme(newTheme);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(newTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [preferences.theme, mounted]);

  // Apply language
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = preferences.language;
  }, [preferences.language, mounted]);

  // Save preferences to localStorage whenever they change
  const savePreferences = useCallback((newPrefs: AppPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
    } catch (e) {
      console.error("Failed to save preferences:", e);
    }
  }, []);

  const setTheme = useCallback((theme: Theme) => {
    setPreferences((prev) => {
      const newPrefs = { ...prev, theme };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, [savePreferences]);

  const setLanguage = useCallback((language: Language) => {
    setPreferences((prev) => {
      const newPrefs = { ...prev, language };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, [savePreferences]);

  const setTimezone = useCallback((timezone: Timezone) => {
    setPreferences((prev) => {
      const newPrefs = { ...prev, timezone };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, [savePreferences]);

  // Date/time formatting utilities using the selected timezone
  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const d = typeof date === "string" ? new Date(date) : date;
      return new Intl.DateTimeFormat(preferences.language, {
        timeZone: preferences.timezone,
        dateStyle: "medium",
        ...options,
      }).format(d);
    },
    [preferences.language, preferences.timezone]
  );

  const formatTime = useCallback(
    (date: Date | string) => {
      const d = typeof date === "string" ? new Date(date) : date;
      return new Intl.DateTimeFormat(preferences.language, {
        timeZone: preferences.timezone,
        timeStyle: "short",
      }).format(d);
    },
    [preferences.language, preferences.timezone]
  );

  const formatDateTime = useCallback(
    (date: Date | string) => {
      const d = typeof date === "string" ? new Date(date) : date;
      return new Intl.DateTimeFormat(preferences.language, {
        timeZone: preferences.timezone,
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
    },
    [preferences.language, preferences.timezone]
  );

  const formatRelativeTime = useCallback(
    (date: Date | string) => {
      const d = typeof date === "string" ? new Date(date) : date;
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

      const rtf = new Intl.RelativeTimeFormat(preferences.language, {
        numeric: "auto",
      });

      if (diffInSeconds < 60) return rtf.format(-diffInSeconds, "second");
      if (diffInSeconds < 3600)
        return rtf.format(-Math.floor(diffInSeconds / 60), "minute");
      if (diffInSeconds < 86400)
        return rtf.format(-Math.floor(diffInSeconds / 3600), "hour");
      if (diffInSeconds < 2592000)
        return rtf.format(-Math.floor(diffInSeconds / 86400), "day");
      if (diffInSeconds < 31536000)
        return rtf.format(-Math.floor(diffInSeconds / 2592000), "month");
      return rtf.format(-Math.floor(diffInSeconds / 31536000), "year");
    },
    [preferences.language]
  );

  // Translation function
  const t = useCallback(
    (path: string) => getTranslation(preferences.language, path),
    [preferences.language]
  );

  // Get current translations object
  const currentTranslations = translations[preferences.language] as TranslationKeys;

  // Prevent flash of incorrect theme
  if (!mounted) {
    return (
      <AppPreferencesContext.Provider
        value={{
          theme: "system",
          resolvedTheme: "light",
          language: "en",
          timezone: "UTC",
          setTheme: () => {},
          setLanguage: () => {},
          setTimezone: () => {},
          formatDate: () => "",
          formatTime: () => "",
          formatDateTime: () => "",
          formatRelativeTime: () => "",
          t: (path: string) => getTranslation("en", path),
          translations: translations.en,
        }}
      >
        {children}
      </AppPreferencesContext.Provider>
    );
  }

  return (
    <AppPreferencesContext.Provider
      value={{
        theme: preferences.theme,
        resolvedTheme,
        language: preferences.language,
        timezone: preferences.timezone,
        setTheme,
        setLanguage,
        setTimezone,
        formatDate,
        formatTime,
        formatDateTime,
        formatRelativeTime,
        t,
        translations: currentTranslations,
      }}
    >
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);
  if (context === undefined) {
    throw new Error(
      "useAppPreferences must be used within an AppPreferencesProvider"
    );
  }
  return context;
}

// Helper exports
export { languageNames };
export type { Theme, Language, Timezone };
