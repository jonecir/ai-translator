// frontend/src/pages/Jobs.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/api";
import { useTranslation } from "react-i18next";
import {
  LANG_OPTIONS_SORTED as LANG_OPTIONS,
  getLocalizedLangLabel,
  normalizeLang,
} from "@/i18n/languages";
import i18n from "i18next";

/* Utils */
const cx = (...xs) => xs.filter(Boolean).join(" ");
const shortId = (v) => (v == null ? "-" : String(v).slice(0, 8));

const JOBS = "/jobs/";

/* ---------- Helpers de formatação p/ métricas ---------- */
const nf = new Intl.NumberFormat("pt-BR");
const fmtNum = (v) => (v == null || Number.isNaN(v) ? "–" : nf.format(Math.round(v)));
const fmtMoney = (v) =>
  v == null || Number.isNaN(v)
    ? "–"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "USD",
      }).format(Number(v));

const fmtMs = (v) => (v == null || Number.isNaN(v) ? "–" : `${Math.round(v)} ms`);
const fmtSec = (v) => (v == null || Number.isNaN(v) ? "–" : `${(Number(v) / 1000).toFixed(1)} s`);

/* Consolida métricas */
function normalizeJobMetrics(jobData) {
  const jobMetrics = jobData?.metrics || {};
  const targets = jobData?.targets || jobData?.destinos || [];

  const perLang = targets.map((t) => {
    const m = t?.metrics || {};
    const lang = t?.lang || t?.target_lang || "—";
    return {
      lang,
      status: t?.status || "—",
      tokens_in: Number(m.tokens_in ?? m.input_tokens ?? m.src_tokens ?? 0) || 0,
      tokens_out: Number(m.tokens_out ?? m.output_tokens ?? m.tgt_tokens ?? 0) || 0,
      cost_usd: Number(m.cost_usd ?? m.cost ?? 0) || 0,
      latency_ms: Number(m.latency_ms ?? m.latency ?? 0) || 0,
      duration_ms: Number(m.duration_ms ?? m.duration ?? 0) || 0,
    };
  });

  const sum = (arr, key) => arr.reduce((a, b) => a + (Number(b[key]) || 0), 0);
  const tokens_in = sum(perLang, "tokens_in");
  const tokens_out = sum(perLang, "tokens_out");
  const cost_usd = sum(perLang, "cost_usd");
  const duration_ms_sum = sum(perLang, "duration_ms");
  const latency_ms_avg =
    perLang.length > 0
      ? perLang.reduce((a, b) => a + (Number(b.latency_ms) || 0), 0) / perLang.length
      : 0;

  const targets_total = targets.length;
  const targets_done = targets.filter((t) => t.status === "done").length;
  const targets_failed = targets.filter((t) => t.status === "failed").length;

  const mergedSummary = {
    tokens_in: Number(jobMetrics.tokens_in ?? jobMetrics.input_tokens ?? tokens_in) || tokens_in,
    tokens_out:
      Number(jobMetrics.tokens_out ?? jobMetrics.output_tokens ?? tokens_out) || tokens_out,
    cost_usd: Number(jobMetrics.cost_usd ?? jobMetrics.cost ?? cost_usd) || cost_usd,
    latency_ms_avg:
      Number(jobMetrics.latency_ms_avg ?? jobMetrics.latency ?? latency_ms_avg) || latency_ms_avg,
    duration_ms_sum:
      Number(jobMetrics.duration_ms_sum ?? jobMetrics.duration ?? duration_ms_sum) ||
      duration_ms_sum,
    targets_done,
    targets_failed,
    targets_total,
  };

  return { summary: mergedSummary, perLang };
}

/* Hook: debounce simples */
function useDebouncedValue(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* Toast simples */
function Toast({ show, tone = "success", children, onClose, closeLabel }) {
  if (!show) return null;
  return (
    <div
      className={cx(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "rounded-xl border px-4 py-2 shadow-lg",
        tone === "success" && "bg-green-50 border-green-200 text-green-800",
        tone === "error" && "bg-red-50 border-red-200 text-red-800",
        tone === "info" && "bg-blue-50 border-blue-200 text-blue-800",
      )}
    >
      <div className="flex items-center gap-3">
        <span>{children}</span>
        <button onClick={onClose} className="text-sm opacity-70 hover:opacity-100">
          {closeLabel || "×"}
        </button>
      </div>
    </div>
  );
}

export default function Jobs() {
  const { t } = useTranslation();
  const uiLang = i18n.language || "en";
  const langLabel = (code) => {
    const norm = normalizeLang(code) || code;
    return getLocalizedLangLabel(norm, uiLang);
  };
  const trStatus = (s) => {
    switch (String(s || "").toLowerCase()) {
      case "done":
        return t("jobs.status.done");
      case "processing":
        return t("jobs.status.processing");
      case "queued":
        return t("jobs.status.processing"); // "queued" tratado como processing
      case "failed":
        return t("jobs.status.failed");
      case "mixed":
        return t("jobs.status.mixed");
      default:
        return s ?? "-";
    }
  };

  /* filtros / busca */
  const [q, setQ] = useState("");
  const qDeb = useDebouncedValue(q, 400);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* upload */
  const [file, setFile] = useState(null);
  const [sourceLang, setSourceLang] = useState("pt-BR");
  const [targetLangs, setTargetLangs] = useState(["en-US"]); // múltiplos
  const [glossaryId, setGlossaryId] = useState(null);
  const [uploading, setUploading] = useState(false);

  /* dados */
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  /* glossários */
  const [glossaries, setGlossaries] = useState([]);

  /* excluir (modal) */
  const [confirmDelete, setConfirmDelete] = useState(null);

  /* métricas (modal) */
  const [metricsJob, setMetricsJob] = useState(null);

  /* toast */
  const [toast, setToast] = useState({
    show: false,
    tone: "success",
    msg: "",
  });
  const showToast = (msg, tone = "success") => setToast({ show: true, tone, msg });
  const closeToast = () => setToast((tState) => ({ ...tState, show: false }));

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  /* Date format dependente do idioma (simples) */
  const fmtDate = (s) => (s ? new Date(s).toLocaleString() : "-");

  /* Carregar glossários uma vez */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/glossaries");
        setGlossaries(Array.isArray(data) ? data : []);
      } catch {
        setGlossaries([]);
      }
    })();
  }, []);

  /* Carregar jobs */
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(JOBS, {
        params: { q: qDeb || undefined, page, page_size: pageSize },
      });
      const list = data?.items ?? [];
      const tot = data?.total ?? 0;
      setItems(list);
      setTotal(tot);
      return { list, tot };
    } catch (e) {
      console.error("Erro ao listar jobs:", e);
      return { list: [], tot: 0 };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [qDeb]);

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDeb, page, pageSize]);

  /* Sempre que trocar "De", removemos esse idioma dos destinos */
  useEffect(() => {
    setTargetLangs((langs) => langs.filter((t) => t !== sourceLang));
  }, [sourceLang]);

  /* Poll fino para 1 job específico até concluir */
  const pollJobUntilDone = async (jobId, { maxTries = 60, intervalMs = 1000 } = {}) => {
    let tries = 0;
    while (tries < maxTries) {
      tries += 1;
      try {
        const { data } = await api.get(`${JOBS}${jobId}`);
        // atualiza tabela
        await fetchJobs();

        const targets = data.targets || data.destinos || [];
        const anyRunning = targets.some((t) => ["processing", "queued"].includes(t.status));
        const jobDone =
          data.status === "done" || (!anyRunning && ["mixed", "failed"].includes(data.status));

        if (jobDone) {
          const done = targets.filter((t) => t.status === "done").length;
          const failed = targets.filter((t) => t.status === "failed").length;
          showToast(
            t("toast.jobFinished", { id: jobId, done, failed }),
            failed ? "info" : "success",
          );
          return;
        }
      } catch (e) {
        console.error("Polling falhou:", e);
        // continua tentando
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    showToast(
      t(
        "toast.jobStillProcessing",
        { id: jobId },
        {
          defaultValue: "Job {{id}} ainda em processamento. Atualize mais tarde.",
        },
      ),
      "info",
    );
  };

  /* Enviar novo job */
  const onSubmit = async (e) => {
    e?.preventDefault();
    if (!file) return;

    const cleanedTargets = Array.from(new Set(targetLangs.filter((t) => t && t !== sourceLang)));
    if (cleanedTargets.length === 0) {
      alert(
        t("jobs.needDifferentTarget", {
          defaultValue: "Selecione pelo menos 1 destino diferente do idioma de origem.",
        }),
      );
      return;
    }

    const form = new FormData();
    form.append("file", file);
    if (glossaryId) form.append("glossary_id", String(glossaryId));
    form.append("source_lang", sourceLang);
    cleanedTargets.forEach((tgt) => form.append("target_langs", tgt));

    setUploading(true);
    try {
      const { data } = await api.post(JOBS, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Limpa inputs
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setQ("");
      setPage(1);
      await fetchJobs();

      // Poll fino do job criado
      const newJobId = data?.id;
      if (newJobId) {
        pollJobUntilDone(newJobId);
      }
    } catch (e) {
      console.error("Falha ao criar job:", e);
      alert(
        t("jobs.couldNotCreate", {
          defaultValue: "Não foi possível criar o job. Verifique o arquivo e tente novamente.",
        }),
      );
    } finally {
      setUploading(false);
    }
  };

  /* Download (todos os destinos -> zip OU único destino) */
  const onDownload = async (job) => {
    const targets = job.targets || job.destinos || [];
    try {
      const { data } = await api.get(`${JOBS}${job.id}/download`, {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download =
        targets.length > 1 ? `job_${job.id}_outputs.zip` : job.title || `output_${job.id}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Falha no download:", e);
      alert(
        t("jobs.downloadNotReady", {
          defaultValue: "Saída ainda não está pronta ou ocorreu um erro no download.",
        }),
      );
    }
  };

  /* Download por idioma */
  const onDownloadLang = async (job, lang) => {
    try {
      const { data } = await api.get(`${JOBS}${job.id}/download`, {
        params: { lang },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      const base = job.title || `output_${job.id}.docx`;
      a.href = url;
      a.download = base.replace(/\.docx$/i, `_${lang}.docx`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(
        t("jobs.downloadLangFail", {
          lang,
          defaultValue: "Falha ao baixar {{lang}}",
        }),
      );
    }
  };

  /* Excluir job */
  const onConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/jobs/${confirmDelete.id}`);
      setConfirmDelete(null);
      await fetchJobs();
      showToast(
        t("jobs.deleted", { id: confirmDelete.id }, { defaultValue: "Job {{id}} excluído." }),
        "success",
      );
    } catch (e) {
      console.error(e);
      showToast(
        t("jobs.deleteFail", {
          defaultValue: "Falha ao excluir o job.",
        }),
        "error",
      );
    }
  };

  /* Métricas (GET /jobs/:id) */
  const openMetrics = async (jobId) => {
    try {
      const { data } = await api.get(`${JOBS}${jobId}`);
      const normalized = normalizeJobMetrics(data || {});
      setMetricsJob({
        id: jobId,
        metrics: normalized.summary,
        perLang: normalized.perLang,
      });
    } catch (e) {
      console.error(e);
      alert(
        t("jobs.metricsFail", {
          defaultValue: "Não foi possível carregar as métricas.",
        }),
      );
    }
  };

  const disabledUpload =
    !file || uploading || targetLangs.filter((t) => t !== sourceLang).length === 0;

  return (
    <div className="w-full max-w-none mx-auto p-4 md:px-8 lg:px-12 grid gap-6">
      <h1 className="text-2xl font-semibold">{t("jobs.title")}</h1>

      {/* CARD: novo job */}
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-4 grid gap-4"
      >
        {/* CABEÇALHO: Arquivo / Glossário / De / Para */}
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          {/* Arquivo */}
          <div className="flex-1 min-w-[280px] self-center">
            <label className="text-sm text-neutral-600 dark:text-neutral-300">
              {t("jobs.file")}
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="h-10 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3
                        file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-black/10 dark:file:border-white/10
                        file:bg-black/5 dark:file:bg-white/10"
            />
            {file && (
              <div className="text-xs text-neutral-500">
                {t("jobs.selected", {
                  defaultValue: "Selecionado:",
                })}{" "}
                <span className="font-medium">{file.name}</span>
              </div>
            )}
          </div>

          {/* Glossário */}
          <div className="w-[220px] self-center">
            <label className="text-sm text-neutral-600 dark:text-neutral-300">
              {t("jobs.glossary")}
            </label>
            <select
              value={glossaryId ?? ""}
              onChange={(e) => setGlossaryId(Number(e.target.value) || null)}
              className="h-10 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3"
            >
              <option value="">
                {t("jobs.noGlossary", {
                  defaultValue: "Sem glossário",
                })}
              </option>
              {glossaries.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} (ID {g.id})
                </option>
              ))}
            </select>
          </div>

          {/* De */}
          <div className="w-[220px] self-center">
            <label className="text-sm text-neutral-600 dark:text-neutral-300">
              {t("jobs.from")}
            </label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="h-10 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3"
            >
              {LANG_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {langLabel(opt.code)}
                </option>
              ))}
            </select>
          </div>

          {/* Para (múltiplos) */}
          <div className="w-full md:w-[280px] lg:w-[240px]">
            <label className="text-sm text-neutral-600 dark:text-neutral-300">
              {t("jobs.to_multiple")}
            </label>
            <select
              multiple
              value={targetLangs}
              onChange={(e) => {
                const arr = Array.from(e.target.selectedOptions).map((o) => o.value);
                setTargetLangs(arr);
              }}
              className="h-28 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3"
            >
              {LANG_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code} disabled={opt.code === sourceLang}>
                  {langLabel(opt.code)}
                  {opt.code === sourceLang
                    ? ` — ${t("jobs.sameAsFrom", {
                        defaultValue: "igual ao 'De'",
                      })}`
                    : ""}
                </option>
              ))}
            </select>
            <div className="text-xs text-neutral-500">{t("jobs.hold_ctrl")}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={disabledUpload}
            className={cx(
              "h-10 px-4 rounded-xl border border-black/10 dark:border-white/10",
              "hover:bg-black/5 dark:hover:bg-white/10",
              disabledUpload && "opacity-50 cursor-not-allowed",
            )}
          >
            {uploading
              ? t("jobs.sending", {
                  defaultValue: "Enviando...",
                })
              : t("actions.create")}
          </button>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="h-10 px-4 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {t("actions.clear")}
          </button>
        </div>
      </form>

      {/* CARD: filtros */}
      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-4 grid gap-3 md:flex md:items-center md:justify-between">
        <input
          id="jobs-search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("jobs.searchPlaceholder")}
          className="h-10 w-full md:w-80 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3"
        />
        <div className="flex items-center gap-2">
          <label htmlFor="page-size" className="text-sm text-neutral-500">
            {t("jobs.itemsPerPage", {
              defaultValue: "Itens por página",
            })}
          </label>
          <select
            id="page-size"
            name="page_size"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-10 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABELA (com scroll + header sticky) */}
      <div className="overflow-x-auto overflow-y-auto max-h-[65vh] rounded-2xl border border-black/10 dark:border-white/10">
        <table className="min-w-full text-sm">
          <thead className="text-left sticky top-0 z-10 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
            <tr>
              <th className="px-3 py-2">{t("jobs.table.id")}</th>
              <th className="px-3 py-2">{t("jobs.table.title")}</th>
              <th className="px-3 py-2">{t("jobs.table.status")}</th>
              <th className="px-3 py-2">{t("jobs.table.targets")}</th>
              <th className="px-3 py-2">{t("jobs.table.updated")}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-neutral-500">
                  {t("jobs.loading")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-neutral-500">
                  {t("jobs.empty")}
                </td>
              </tr>
            ) : (
              items.map((j) => {
                const targets = j.targets || j.destinos || [];
                const isRunning =
                  j.status === "processing" || j.status === "queued" || j.status === "mixed";
                return (
                  <tr key={j.id} className="border-t border-black/5 dark:border-white/10">
                    <td className="px-3 py-2 font-mono text-xs">{shortId(j.id)}</td>
                    <td className="px-3 py-2">{j.title || "-"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cx(
                          "px-2 py-1 rounded-full text-xs border",
                          j.status === "done" &&
                            "bg-green-100 text-green-700 border-green-200/70 dark:bg-green-900/25 dark:text-green-300",
                          isRunning &&
                            "bg-yellow-100 text-yellow-700 border-yellow-200/70 dark:bg-yellow-900/25 dark:text-yellow-300",
                          j.status === "failed" &&
                            "bg-red-100 text-red-700 border-red-200/70 dark:bg-red-900/25 dark:text-red-300",
                          j.status === "mixed" &&
                            "bg-blue-100 text-blue-700 border-blue-200/70 dark:bg-blue-900/25 dark:text-blue-300",
                        )}
                      >
                        {trStatus(j.status)}
                      </span>
                    </td>

                    {/* DESTINOS: apenas o idioma (sem status) */}
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {targets.map((tgt) => {
                          const code = tgt.lang || tgt.target_lang || "";
                          const label = code ? langLabel(code) || code : "–";
                          return (
                            <span
                              key={tgt.id || code}
                              className={cx(
                                "px-2 py-0.5 rounded-full text-xs border",
                                "border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.06]",
                              )}
                              title={code}
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    <td className="px-3 py-2 text-neutral-500">{fmtDate(j.updated_at)}</td>

                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => openMetrics(j.id)}
                        className="h-9 px-3 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 mr-2"
                      >
                        {t("actions.metrics")}
                      </button>

                      {targets.length > 1 ? (
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => onDownload(j)}
                            className="h-9 px-3 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                            disabled={!targets.some((t) => t.status === "done")}
                          >
                            {t("actions.downloadZip")}
                          </button>
                          <select
                            onChange={(e) => {
                              const lang = e.target.value;
                              if (lang) onDownloadLang(j, lang);
                              e.currentTarget.selectedIndex = 0;
                            }}
                            className="h-9 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-2"
                          >
                            <option value="">
                              {t("actions.downloadByLang", {
                                defaultValue: "Baixar por idioma…",
                              })}
                            </option>
                            {targets.map((tgt) => {
                              const c = tgt.lang || tgt.target_lang || "";
                              const name = c ? langLabel(c) || c : "–";
                              return (
                                <option
                                  key={tgt.id || c}
                                  value={c}
                                  disabled={tgt.status !== "done"}
                                >
                                  {name}{" "}
                                  {tgt.status !== "done"
                                    ? t("jobs.waiting", {
                                        defaultValue: "(aguardando)",
                                      })
                                    : ""}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      ) : (
                        <button
                          onClick={() => onDownload(j)}
                          disabled={j.status !== "done"}
                          className={cx(
                            "h-9 px-3 rounded-lg border border-black/10 dark:border-white/10",
                            "hover:bg-black/5 dark:hover:bg-white/10",
                            j.status !== "done" && "opacity-50 cursor-not-allowed",
                          )}
                        >
                          {t("actions.download")}
                        </button>
                      )}

                      {/* Excluir */}
                      <button
                        onClick={() => setConfirmDelete(j)}
                        className="ml-2 h-9 px-3 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
                      >
                        {t("actions.delete")}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* paginação */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-500">
          {t("jobs.total")}: <span className="font-medium">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={cx(
              "h-9 px-3 rounded-lg border border-black/10 dark:border-white/10",
              "hover:bg-black/5 dark:hover:bg-white/10",
              page <= 1 && "opacity-50 cursor-not-allowed",
            )}
          >
            {t("jobs.prev")}
          </button>
          <div className="text-sm tabular-nums">
            {t("jobs.page")} <span className="font-medium">{page}</span> / {totalPages}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={cx(
              "h-9 px-3 rounded-lg border border-black/10 dark:border-white/10",
              "hover:bg-black/5 dark:hover:bg-white/10",
              page >= totalPages && "opacity-50 cursor-not-allowed",
            )}
          >
            {t("jobs.next")}
          </button>
        </div>
      </div>

      {/* Modal de métricas */}
      {metricsJob && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">
                {t("metrics.title")} {metricsJob.id}
              </h3>
              <button
                onClick={() => setMetricsJob(null)}
                className="text-sm px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
              >
                {t("common.close")}
              </button>
            </div>

            {/* Resumo agregado */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-sm">
              <div className="rounded-xl border border-black/10 dark:border-white/10 p-3">
                <div className="text-neutral-500">{t("metrics.tokens_in")}</div>
                <div className="font-medium">{fmtNum(metricsJob.metrics?.tokens_in)}</div>
              </div>
              <div className="rounded-xl border border-black/10 dark:border-white/10 p-3">
                <div className="text-neutral-500">{t("metrics.tokens_out")}</div>
                <div className="font-medium">{fmtNum(metricsJob.metrics?.tokens_out)}</div>
              </div>
              <div className="rounded-xl border border-black/10 dark:border-white/10 p-3">
                <div className="text-neutral-500">{t("metrics.cost_total")}</div>
                <div className="font-medium">{fmtMoney(metricsJob.metrics?.cost_usd)}</div>
              </div>
              <div className="rounded-xl border border-black/10 dark:border-white/10 p-3">
                <div className="text-neutral-500">{t("metrics.latency_avg")}</div>
                <div className="font-medium">{fmtMs(metricsJob.metrics?.latency_ms_avg)}</div>
              </div>
              <div className="rounded-xl border border-black/10 dark:border-white/10 p-3">
                <div className="text-neutral-500">{t("metrics.time_total")}</div>
                <div className="font-medium">{fmtSec(metricsJob.metrics?.duration_ms_sum)}</div>
              </div>
              <div className="rounded-xl border border-black/10 dark:border-white/10 p-3">
                <div className="text-neutral-500">{t("metrics.destinations")}</div>
                <div className="font-medium">
                  {metricsJob.metrics?.targets_done ?? 0}{" "}
                  {t("jobs.okShort", {
                    defaultValue: "ok",
                  })}{" "}
                  · {metricsJob.metrics?.targets_failed ?? 0}{" "}
                  {t("jobs.fail", {
                    defaultValue: "falha",
                  })}{" "}
                  · {metricsJob.metrics?.targets_total ?? 0}{" "}
                  {t("metrics.total", {
                    defaultValue: "total",
                  })}
                </div>
              </div>
            </div>

            {/* Tabela por idioma */}
            <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
              <table className="min-w-full text-sm">
                <thead className="bg-black/[0.03] dark:bg-white/[0.06] text-left">
                  <tr>
                    <th className="px-3 py-2">{t("metrics.lang")}</th>
                    <th className="px-3 py-2">{t("metrics.status")}</th>
                    <th className="px-3 py-2">{t("metrics.tokens_in_col")}</th>
                    <th className="px-3 py-2">{t("metrics.tokens_out_col")}</th>
                    <th className="px-3 py-2">{t("metrics.cost_col")}</th>
                    <th className="px-3 py-2">{t("metrics.latency_col")}</th>
                    <th className="px-3 py-2">{t("metrics.duration_col")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(metricsJob.perLang) && metricsJob.perLang.length > 0 ? (
                    metricsJob.perLang.map((row, i) => (
                      <tr key={i} className="border-t border-black/5 dark:border-white/10">
                        <td className="px-3 py-2">{langLabel(row.lang || "")}</td>
                        <td className="px-3 py-2">
                          <span
                            className={cx(
                              "px-2 py-0.5 rounded-full text-xs border",
                              row.status === "done" &&
                                "bg-green-100 text-green-700 border-green-200/70 dark:bg-green-900/25 dark:text-green-300",
                              row.status === "processing" &&
                                "bg-yellow-100 text-yellow-700 border-yellow-200/70 dark:bg-yellow-900/25 dark:text-yellow-300",
                              row.status === "queued" &&
                                "bg-yellow-100 text-yellow-700 border-yellow-200/70 dark:bg-yellow-900/25 dark:text-yellow-300",
                              row.status === "failed" &&
                                "bg-red-100 text-red-700 border-red-200/70 dark:bg-red-900/25 dark:text-red-300",
                            )}
                          >
                            {trStatus(row.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums">{fmtNum(row.tokens_in)}</td>
                        <td className="px-3 py-2 tabular-nums">{fmtNum(row.tokens_out)}</td>
                        <td className="px-3 py-2 tabular-nums">{fmtMoney(row.cost_usd)}</td>
                        <td className="px-3 py-2 tabular-nums">{fmtMs(row.latency_ms)}</td>
                        <td className="px-3 py-2 tabular-nums">{fmtSec(row.duration_ms)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-neutral-500">
                        {t("jobs.noMetrics", {
                          defaultValue: "Sem métricas registradas.",
                        })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 p-4">
            <h3 className="font-semibold mb-2">
              {t("jobs.confirm_delete_title", {
                defaultValue: "Excluir job",
              })}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {t("jobs.confirm_delete_msg")} <b>{confirmDelete.title || confirmDelete.id}</b>?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="h-9 px-3 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
              >
                {t("actions.cancel")}
              </button>
              <button
                onClick={onConfirmDelete}
                className="h-9 px-3 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                {t("actions.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <Toast
        show={toast.show}
        tone={toast.tone}
        onClose={closeToast}
        closeLabel={t("common.close")}
      >
        {toast.msg}
      </Toast>
    </div>
  );
}
