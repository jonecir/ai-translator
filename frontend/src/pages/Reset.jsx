// frontend/src/pages/Reset.jsx
import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useToast } from "@/ui/Toast";
import { useTranslation } from "react-i18next";

export default function Reset() {
  const { t } = useTranslation();

  const [sp] = useSearchParams();
  const token = useMemo(() => sp.get("token") || "", [sp]);

  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();
  const push = toast?.push ?? (() => {});

  const onSubmit = async (e) => {
    e.preventDefault();

    if (pwd1 !== pwd2) {
      push({ title: t("reset.error.mismatch"), tone: "error" });
      return;
    }

    setLoading(true);

    try {
      await api.post("/reset", { token, password: pwd1 });
      push({ title: t("reset.success") });
      navigate("/login");
    } catch (e) {
      push({
        title: t("reset.error.title"),
        desc: e?.message ?? "",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto grid gap-4 p-4">
      <h2 className="text-xl font-semibold">{t("reset.title")}</h2>

      <form onSubmit={onSubmit} className="grid gap-3">
        <input
          type="password"
          value={pwd1}
          onChange={(e) => setPwd1(e.target.value)}
          placeholder={t("reset.newPassword")}
          className="h-10 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3"
        />

        <input
          type="password"
          value={pwd2}
          onChange={(e) => setPwd2(e.target.value)}
          placeholder={t("reset.confirmPassword")}
          className="h-10 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3"
        />

        <button
          disabled={loading || !token}
          className="h-10 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
        >
          {loading ? t("reset.loading") : t("reset.submit")}
        </button>

        {!token && <div className="text-sm text-neutral-500">{t("reset.noToken")}</div>}
      </form>
    </div>
  );
}
