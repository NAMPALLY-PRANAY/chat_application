import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [loading, setLoading] = useState(true);

  const persistAuth = useCallback((payload) => {
    setToken(payload.token);
    setUser(payload.user);
    localStorage.setItem("token", payload.token);
    connectSocket(payload.token);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    persistAuth(data);
  }, [persistAuth]);

  const register = useCallback(async (username, email, password, avatar = "") => {
    const { data } = await api.post("/auth/register", {
      username,
      email,
      password,
      avatar,
    });
    persistAuth(data);
  }, [persistAuth]);

  const logout = useCallback(() => {
    setUser(null);
    setToken("");
    localStorage.removeItem("token");
    disconnectSocket();
  }, []);

  const updatePreferences = useCallback(async (payload) => {
    const { data } = await api.patch("/users/me/preferences", payload);
    setUser((prev) => ({ ...prev, ...data }));
    return data;
  }, []);

  const updateEmail = useCallback(async (email, password) => {
    const { data } = await api.patch("/users/me/email", { email, password });
    setUser((prev) => ({ ...prev, ...data }));
    return data;
  }, []);

  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    const { data } = await api.patch("/users/me/password", { currentPassword, newPassword });
    return data;
  }, []);

  const refreshLoginEntries = useCallback(async () => {
    const { data } = await api.get("/users/me/login-entries");
    setUser((prev) => (prev ? { ...prev, loginEntries: data } : prev));
    return data;
  }, []);

  const updateAvatar = useCallback(async (avatar) => {
    const { data } = await api.patch("/users/me/avatar", { avatar });
    setUser((prev) => ({ ...prev, ...data }));
    return data;
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
        connectSocket(token);
      } catch (_error) {
        logout();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [token, logout]);

  useEffect(() => {
    const theme = user?.preferences?.theme || "system";
    const accent = user?.preferences?.accent || "teal";

    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.accent = accent;
  }, [user?.preferences?.theme, user?.preferences?.accent]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      setUser,
      updatePreferences,
      updateEmail,
      updatePassword,
      refreshLoginEntries,
      updateAvatar,
    }),
    [
      user,
      token,
      loading,
      login,
      register,
      logout,
      updatePreferences,
      updateEmail,
      updatePassword,
      refreshLoginEntries,
      updateAvatar,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
