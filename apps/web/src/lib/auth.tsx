import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { User, AuthResponse } from "@acme/shared";
import { api, ApiError } from "./api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (response: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("auth_token"),
  );
  const [isLoading, setIsLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    api
      .get<User>("/auth/me")
      .then((u) => {
        setUser(u);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem("auth_token");
          setToken(null);
        }
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const login = useCallback((response: AuthResponse) => {
    localStorage.setItem("auth_token", response.token);
    setToken(response.token);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    // Query keys are not per-user, so drop everything cached for the signed-out user.
    queryClient.clear();
    setToken(null);
    setUser(null);
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
