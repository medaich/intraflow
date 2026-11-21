import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import type { User } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const fetchCurrentUser = useCallback(async (): Promise<User | null> => {
    try {
      const res = await apiClient.get<User>("/users/me");
      setUser(res.data);
      return res.data;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchCurrentUser().finally(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      // 1. Authenticate with backend and receive signed session cookies
      await apiClient.post("/auth/signin", { email, password });

      // 2. Hydrate full user profile with membership data
      const meRes = await apiClient.get<User>("/users/me");
      setUser(meRes.data);
      queryClient.clear();
      return meRes.data;
    } catch (error) {
      const message = getErrorMessage(error);
      throw new Error(message);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient.post("/auth/signout");
    } catch (err) {
      console.warn("Signout request failed, clearing client state anyway", err);
    } finally {
      setUser(null);
      queryClient.clear();
      toast.success("Signed out successfully");
    }
  };

  const refreshUser = async (): Promise<User | null> => {
    return fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
