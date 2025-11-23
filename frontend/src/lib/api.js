// src/lib/api.js
import axios from "axios";
import i18next from "i18next";

// -------- Base URL --------
const DEV = import.meta.env.DEV;
const ENV_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const BASE_URL = DEV ? "/api" : ENV_BASE || "/api";

// Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: false,
});

// -------- Helpers de token --------
export const getToken = () => localStorage.getItem("token") || "";
export const setToken = (t) => localStorage.setItem("token", t || "");
export const clearToken = () => localStorage.removeItem("token");

// -------- Interceptor de request --------
api.interceptors.request.use((config) => {
  // Authorization se existir token
  const t = getToken();
  if (t && t !== "null" && t !== "undefined" && t.trim() !== "") {
    config.headers.Authorization = `Bearer ${t}`;
  } else {
    delete config.headers.Authorization;
  }

  // Adiciona ?lang= atual (sem sobrescrever) — mantém backend e frontend alinhados
  const current = i18next.language || localStorage.getItem("i18nextLng") || "pt";
  const l = (current || "").toLowerCase();
  const normalized = l.startsWith("pt") ? "pt" : l.startsWith("zh") ? "zh-CN" : current;

  config.params = config.params || {};
  if (!("lang" in config.params)) {
    config.params.lang = normalized;
  }

  return config;
});

// -------- Interceptor de response (refresh 401 com fila) --------
let isRefreshing = false;
let queued = [];

const flushQueue = (err, newToken = null) => {
  queued.forEach((p) => (err ? p.reject(err) : p.resolve(newToken)));
  queued = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queued.push({ resolve, reject });
        }).then((newToken) => {
          if (newToken) {
            original.headers.Authorization = `Bearer ${newToken}`;
          } else {
            delete original.headers.Authorization;
          }
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post("/auth/refresh", {}, { withCredentials: true });

        if (data?.token) {
          setToken(data.token);
          api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
          flushQueue(null, data.token);
          return api(original);
        }
        throw new Error("Refresh sem token");
      } catch (err) {
        clearToken();
        flushQueue(err, null);
        throw err;
      } finally {
        isRefreshing = false;
      }
    }

    throw error;
  },
);

export default api;
