// frontend/src/pages/Recover.jsx
import { useState } from "react";
import api from "@/lib/api";
import { useToast } from "@/ui/Toast";
import { useTranslation } from "react-i18next";

export default function Recover() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const toast = useToast();
  const push = toast?.push ?? (() => {});
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/forgot", { email });

      push({
        title: t("toast.recover.successTitle"),
        desc: t("toast.recover.successDesc"),
      });
    } catch (e) {
      const desc = e?.message || t("toast.recover.genericError");
      push({
        title: t("toast.recover.errorTitle"),
        desc,
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto grid gap-4 p-4">
      <h2 className="text-xl font-semibold">{t("recover.title")}</h2>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("recover.emailPlaceholder")}
          className="h-10 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3"
        />
        <button
          disabled={loading}
          className="h-10 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
        >
          {loading ? t("recover.loading") : t("recover.submit")}
        </button>
      </form>
    </div>
  );
}
