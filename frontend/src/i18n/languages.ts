// src/i18n/languages.ts
// Lista única e consistente de idiomas suportados no app.
// Use estes códigos também ao enviar/receber do backend.

export type LangCode =
  | "pt-BR"
  | "en-US"
  | "es-ES"
  | "fr-FR"
  | "it-IT"
  | "de-DE"
  | "ro-RO"
  | "ja-JP"
  | "zh-CN"
  | "nl-NL"
  | "pl-PL";

export interface LangOption {
  code: LangCode;
  label: string; // rótulo visível no dropdown
  native?: string; // nome nativo (quando diferente)
}

export const LANG_OPTIONS: LangOption[] = [
  { code: "de-DE", label: "Deutsch (Deutschland)" },
  { code: "en-US", label: "English (US)" },
  { code: "es-ES", label: "Español (España)" },
  { code: "fr-FR", label: "Français (France)" },
  { code: "it-IT", label: "Italiano (Italia)" },
  { code: "ja-JP", label: "日本語", native: "にほんご" },
  { code: "nl-NL", label: "Nederlands (Nederland)" },
  { code: "pl-PL", label: "Polski (Polska)" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "ro-RO", label: "Română (România)" },
  { code: "zh-CN", label: "中文（简体）" },
];

// Útil para validações/conversões rápidas
export const LANG_SET = new Set<LangCode>(LANG_OPTIONS.map((o) => o.code));
export const LANG_MAP = Object.fromEntries(LANG_OPTIONS.map((o) => [o.code, o]));

// Normaliza string arbitrária para um LangCode conhecido (ou null)
export function normalizeLang(code: string | null | undefined): LangCode | null {
  if (!code) return null;
  const c = code.trim().replace("_", "-");
  if (LANG_SET.has(c as LangCode)) return c as LangCode;

  const base = c.split("-")[0].toLowerCase();
  const found = LANG_OPTIONS.find((o) => o.code.toLowerCase().startsWith(base + "-"));
  return found ? found.code : null;
}

// Usa Intl.DisplayNames (quando disponível) p/ exibir nome do idioma no idioma da UI.
export function getLocalizedLangLabel(code: LangCode, uiLang: string): string {
  try {
    const [lang, region] = code.split("-") as [string, string | undefined];
    // Alguns ambientes não têm Intl.DisplayNames
    // @ts-ignore
    const dnLang =
      typeof Intl !== "undefined" && (Intl as any).DisplayNames
        ? new (Intl as any).DisplayNames([uiLang], { type: "language" })
        : null;
    // @ts-ignore
    const dnRegion =
      typeof Intl !== "undefined" && (Intl as any).DisplayNames
        ? new (Intl as any).DisplayNames([uiLang], { type: "region" })
        : null;

    const langName = dnLang ? dnLang.of(lang) : null;
    const regionName = region && dnRegion ? dnRegion.of(region) : null;

    if (langName && regionName) return `${langName} (${regionName})`;
    if (langName) return langName;
  } catch {
    /* ignora e cai no fallback */
  }
  // Fallback: rótulo estático
  return LANG_MAP[code]?.label ?? code;
}

// Ordena por label (útil se quiser lista ordenada alfabeticamente)
export const LANG_OPTIONS_SORTED: LangOption[] = [...LANG_OPTIONS].sort((a, b) =>
  a.label.localeCompare(b.label),
);
