import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en.json";
import es from "@/locales/es.json";
import pt from "@/locales/pt.json";
import fr from "@/locales/fr.json";

// ── Language detection with localStorage persistence ──
const SUPPORTED_LANGS = ["en", "es", "pt", "fr"] as const;
const STORAGE_KEY = "app-language";
const GEO_RESOLVED_KEY = "app-language-geo-resolved";

export const LANGUAGE_OPTIONS = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "fr", name: "French", nativeName: "Français" },
] as const;

/**
 * Map country codes to supported languages.
 * Covers all major countries where es / pt / fr are primary languages.
 */
const COUNTRY_TO_LANG: Record<string, string> = {
  // Spanish-speaking
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es",
  EC: "es", GT: "es", CU: "es", BO: "es", DO: "es", HN: "es", PY: "es",
  SV: "es", NI: "es", CR: "es", PA: "es", UY: "es", PR: "es", GQ: "es",
  // Portuguese-speaking
  BR: "pt", PT: "pt", AO: "pt", MZ: "pt", CV: "pt", GW: "pt", ST: "pt", TL: "pt",
  // French-speaking
  FR: "fr", BE: "fr", CH: "fr", CA: "fr", LU: "fr", MC: "fr",
  SN: "fr", CI: "fr", ML: "fr", BF: "fr", NE: "fr", TD: "fr", GN: "fr",
  RW: "fr", BJ: "fr", HT: "fr", TG: "fr", CF: "fr", CG: "fr", CD: "fr",
  GA: "fr", DJ: "fr", CM: "fr", MG: "fr", KM: "fr", MU: "fr", SC: "fr",
  // English-speaking (explicit for clarity)
  US: "en", GB: "en", AU: "en", NZ: "en", IE: "en", ZA: "en",
  IN: "en", PH: "en", NG: "en", KE: "en", GH: "en", JM: "en",
  TT: "en", SG: "en", MY: "en", PK: "en", BD: "en",
};

/** Detect language from the browser's navigator.languages / navigator.language */
export function detectBrowserLanguage(): string {
  try {
    const browserLangs: readonly string[] = navigator.languages?.length
      ? navigator.languages
      : [navigator.language || "en"];

    for (const raw of browserLangs) {
      const base = raw.split("-")[0].toLowerCase();
      if ((SUPPORTED_LANGS as readonly string[]).includes(base)) return base;
    }
  } catch {
    // SSR or restricted environment
  }
  return "en";
}

/**
 * Detect language from the user's geographic location via IP geolocation.
 * Uses free, no-key-required APIs with fallback chain.
 * Returns the resolved language code or null if detection fails.
 */
async function detectGeoLanguage(): Promise<string | null> {
  const apis = [
    {
      url: "https://ipapi.co/json/",
      extract: (data: any) => data?.country_code,
    },
    {
      url: "https://ip2c.org/self",
      extract: (_data: any, text: string) => {
        // Response: "1;US;USA;United States"
        const parts = text.split(";");
        return parts.length >= 2 ? parts[1] : null;
      },
    },
  ];

  for (const api of apis) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(api.url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) continue;

      const text = await response.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = null; }

      const country = api.extract(data, text);
      if (country && typeof country === "string") {
        const code = country.toUpperCase().trim();
        const lang = COUNTRY_TO_LANG[code];
        if (lang && (SUPPORTED_LANGS as readonly string[]).includes(lang)) {
          return lang;
        }
        // Known country but not in our map → fall back to English
        return "en";
      }
    } catch {
      // Network error / timeout — try next API
      continue;
    }
  }

  return null; // All APIs failed
}

/**
 * Resolve the language for "auto" mode.
 * Uses browser language immediately, then asynchronously refines with geolocation.
 */
export function resolveAutoLanguage(): string {
  return detectBrowserLanguage();
}

/**
 * Read the user's preference from localStorage.
 * - "auto"  → detect from location/browser
 * - "en" / "es" / "pt" / "fr" → use that language
 * - missing → first visit, default to "auto" (detect)
 */
function getInitialLanguage(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "auto" || !stored) {
      return detectBrowserLanguage();
    }
    if ((SUPPORTED_LANGS as readonly string[]).includes(stored)) {
      return stored;
    }
  } catch {
    // localStorage not available
  }
  return detectBrowserLanguage();
}

/** Returns the raw preference string stored ("auto" | language code | null) */
export function getLanguagePreference(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "auto";
  } catch {
    return "auto";
  }
}

/**
 * Change language preference.
 * @param preference  "auto" to follow location/browser, or a specific language code
 */
export function setLanguagePreference(preference: string) {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // localStorage not available
  }
  if (preference === "auto") {
    // Clear geo cache so it re-detects
    try { localStorage.removeItem(GEO_RESOLVED_KEY); } catch { /* ignore */ }
    // Apply browser language immediately
    const browserLng = detectBrowserLanguage();
    if (i18n.language !== browserLng) {
      i18n.changeLanguage(browserLng);
    }
    // Then refine with geolocation
    runGeoDetection();
  } else {
    if (i18n.language !== preference) {
      i18n.changeLanguage(preference);
    }
  }
}

/**
 * Run async geolocation detection and update i18n if preference is "auto".
 * Caches the result so we only call the API once per session.
 */
async function runGeoDetection() {
  try {
    // Check cache first
    const cached = sessionStorage.getItem(GEO_RESOLVED_KEY);
    if (cached && (SUPPORTED_LANGS as readonly string[]).includes(cached)) {
      const pref = localStorage.getItem(STORAGE_KEY);
      if (pref === "auto" && i18n.language !== cached) {
        i18n.changeLanguage(cached);
      }
      return;
    }

    const geoLang = await detectGeoLanguage();
    if (geoLang) {
      // Cache in sessionStorage (per-session, refreshed on new tabs)
      try { sessionStorage.setItem(GEO_RESOLVED_KEY, geoLang); } catch { /* ignore */ }

      // Only apply if user is still on "auto"
      const currentPref = localStorage.getItem(STORAGE_KEY);
      if (currentPref === "auto" && i18n.language !== geoLang) {
        i18n.changeLanguage(geoLang);
      }
    }
  } catch {
    // Geolocation failed — keep browser language
  }
}

// ── Initialize ──
const initialLng = getInitialLanguage();

// Set "auto" as default on very first visit
try {
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, "auto");
  }
} catch { /* ignore */ }

i18n
  .use(initReactI18next)
  .init({
    lng: initialLng,
    resources: {
      en: { translation: en },
      es: { translation: es },
      pt: { translation: pt },
      fr: { translation: fr },
    },
    fallbackLng: "en",
    supportedLngs: [...SUPPORTED_LANGS],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false,
    },
  });

// If on "auto", kick off geolocation detection to refine the language
if (getLanguagePreference() === "auto") {
  runGeoDetection();
}

export default i18n;
