// frontend/src/pages/Login.jsx
import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/ui/Toast";
import { useTranslation } from "react-i18next";

export default function Login() {
  const { t } = useTranslation();

  const toast = useToast();
  const push = toast?.push ?? (() => {}); // fallback seguro

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login({ email: form.email, password: form.password });

      push({
        title: t("toast.login.welcomeTitle"),
        desc: t("toast.login.welcomeDesc"),
      });

      navigate(from, { replace: true });
    } catch (error) {
      const backendMsg = error?.response?.data?.error || error?.response?.data?.message;

      const msg = backendMsg || t("toast.login.genericError");

      setErr(String(msg));
      push({
        title: t("toast.login.errorTitle"),
        desc: String(msg),
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">{t("login.title")}</h1>

      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-1.5">
          <label htmlFor="email" className="text-sm">
            {t("login.email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={onChange}
            className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3 py-2 outline-none focus:ring-2 ring-black/10 dark:ring-white/20"
            placeholder={t("login.emailPlaceholder")}
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="password" className="text-sm">
            {t("login.password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={onChange}
            className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3 py-2 outline-none focus:ring-2 ring-black/10 dark:ring-white/20"
            placeholder="••••••••"
          />
        </div>

        {err && <div className="text-sm text-red-600 dark:text-red-400">{err}</div>}

        <button
          type="submit"
          disabled={loading}
          className="h-10 rounded-xl bg-black/90 text-white hover:bg-black disabled:opacity-60"
        >
          {loading ? t("login.loading") : t("login.submit")}
        </button>

        <div className="text-xs text-neutral-500">
          {t("login.forgot")}{" "}
          <Link to="/recover" className="underline">
            {t("login.recoverAccess")}
          </Link>
        </div>
      </form>
    </div>
  );
}
