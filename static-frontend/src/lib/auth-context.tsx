import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import i18n from "@/lib/i18n";

type UserRole = "LEARNER" | "CREATOR" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  preferredLanguage?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { email: string; password: string; name?: string; role?: "LEARNER" | "CREATOR" }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (user: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "cxflow_token";
const USER_KEY = "cxflow_user";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

/** Sync the user's current browser language to the backend (fire-and-forget) */
function syncLanguageToBackend(authToken: string) {
  try {
    // Use the actual resolved language from i18next (browser / geo / user preference)
    const langCode = (i18n.language || 'es').slice(0, 2).toLowerCase();
    const allowed = ['es', 'en', 'fr', 'pt'];
    if (!allowed.includes(langCode)) return;
    fetch(`${API_BASE_URL}/users/language`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ language: langCode }),
    }).catch(() => {});
  } catch { /* ignore */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        setToken(storedToken);
        setUser(parsedUser);

        // Validate session in background
        fetch(`${API_BASE_URL}/auth/session`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
          .then((res) => {
            if (!res.ok) {
              // Token expired/invalid
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
              setToken(null);
              setUser(null);
            } else {
              return res.json();
            }
          })
          .then((data) => {
            if (data?.user) {
              setUser(data.user);
              localStorage.setItem(USER_KEY, JSON.stringify(data.user));
              // Sync language to backend on every page load
              syncLanguageToBackend(storedToken);
            }
          })
          .catch(() => {
            // Network error - keep local state
          })
          .finally(() => setIsLoading(false));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return { success: false, error: data?.error || "Login failed" };
      }

      if (data?.user && data?.token) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        syncLanguageToBackend(data.token);
        return { success: true };
      }

      return { success: false, error: "Invalid response" };
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }, []);

  const register = useCallback(async (data: { email: string; password: string; name?: string; role?: "LEARNER" | "CREATOR" }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        return { success: false, error: responseData?.error || "Registration failed" };
      }

      // Auto-login after registration
      if (responseData?.token && responseData?.user) {
        setUser(responseData.user);
        setToken(responseData.token);
        localStorage.setItem(TOKEN_KEY, responseData.token);
        localStorage.setItem(USER_KEY, JSON.stringify(responseData.user));
        syncLanguageToBackend(responseData.token);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper to check roles
export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

// Helper to get token directly (for api-client)
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
