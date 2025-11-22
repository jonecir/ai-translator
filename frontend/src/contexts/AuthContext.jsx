import { createContext, useContext, useEffect, useRef, useState } from "react";
import api, { getToken, setToken, clearToken } from "@/lib/api";
import { getExpMs } from "@/lib/jwt";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// 👇 helper de redirecionamento simples
function redirectToLogin() {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    // evita loop se já estiver na tela de login
    window.location.assign("/login"); // ou .replace("/login")
  }
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const timerRef = useRef(null);

  const scheduleRefresh = (token) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const expMs = getExpMs(token);
    if (!expMs) return;

    // Renova 60s antes de expirar
    const delay = Math.max(expMs - Date.now() - 60_000, 5_000);
    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.post("/refresh", {}, { withCredentials: true });
        if (data?.token) {
          setToken(data.token);
          await fetchMe(); // atualiza user
          scheduleRefresh(data.token);
        } else {
          doLogout(true); // 👈 sem token no refresh → sai e redireciona
        }
      } catch {
        doLogout(true);   // 👈 falha no refresh → sai e redireciona
      }
    }, delay);
  };

  const fetchMe = async () => {
    try {
      const { data } = await api.get("/me");
      setUser(data || null);
    } catch {
      setUser(null);
    }
  };

  const init = async () => {
    const t = getToken();
    if (!t) {
      setUser(null);
      setReady(true);
      return;
    }
    // se já expirou, tenta refresh
    if (Date.now() >= getExpMs(t)) {
      try {
        const { data } = await api.post("/refresh", {}, { withCredentials: true });
        if (data?.token) {
          setToken(data.token);
          await fetchMe();
          scheduleRefresh(data.token);
        } else {
          doLogout(true); // 👈 sem token no refresh inicial
        }
      } catch {
        doLogout(true);   // 👈 refresh inicial falhou
      } finally {
        setReady(true);
      }
      return;
    }
    await fetchMe();
    scheduleRefresh(t);
    setReady(true);
  };

  const doLogin = async (credentials) => {
    // espera backend responder { token, user }
    const { data } = await api.post("/login", credentials, { withCredentials: true });
    setToken(data.token);
    setUser(data.user ?? null);
    scheduleRefresh(data.token);
  };

  // 👇 aceite um flag shouldRedirect (default false)
  const doLogout = (shouldRedirect = false) => {
    clearToken();
    setUser(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (shouldRedirect) redirectToLogin(); // 👈 redireciona para /login
  };

  useEffect(() => {
    init();
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, ready, isLogged: !!user, login: doLogin, logout: doLogout }}>
      {children}
    </AuthCtx.Provider>
  );
}
