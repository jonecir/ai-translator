// frontend/src/components/LanguageSwitcher.jsx
import { useEffect, useState } from "react";
import i18next from "i18next";
import { useTranslation } from "react-i18next";

import {
  LANG_OPTIONS_SORTED,
  getLocalizedLangLabel,
} from "@/i18n/languages";

/**
 * Normaliza qualquer código (pt-BR, pt, en-US, en, de-DE, zh, zh-CN...)
 * para o código usado pelo i18next / arquivos de tradução.
 */
function normalizeUiLang(raw) {
  const l = (raw || "").toLowerCase();
  if (l.startsWith("pt")) return "pt";
  if (l.startsWith("en")) return "en";
  if (l.startsWith("de")) return "de";
  if (l.startsWith("es")) return "es";
  if (l.startsWith("fr")) return "fr";
  if (l.startsWith("it")) return "it";
  if (l.startsWith("ja")) return "ja";
  if (l.startsWith("nl")) return "nl";
  if (l.startsWith("pl")) return "pl";
  if (l.startsWith("ro")) return "ro";
  if (l.startsWith("zh")) return "zh-CN";
  return "pt";
}

/** Mapeia o código de idioma de documento (opt.code) -> código de UI (i18n) */
function uiCodeFromDocCode(code) {
  return normalizeUiLang(code);
}

export default function LanguageSwitcher({ className = "" }) {
  const { t } = useTranslation();

  // estado guarda SEMPRE o código usado pelo i18next (pt, en, de, ...)
  const [lang, setLang] = useState(() =>
    normalizeUiLang(i18next.language ?? "pt")
  );

  // atualiza o atributo <html lang="...">
  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const onChange = async (e) => {
    const newLang = e.target.value; // ex: "en", "pt", "de", "zh-CN"
    setLang(newLang);
    await i18next.changeLanguage(newLang);
    localStorage.setItem("i18nextLng", newLang);
  };

  const uiLang = lang; // usado para traduzir os nomes dos idiomas

  return (
    <div className={className}>
      <label className="sr-only" htmlFor="lang-select">
        {t("lang.select")}
      </label>

      <select
        id="lang-select"
        value={lang}
        onChange={onChange}
        className="h-9 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3"
        aria-label={t("lang.select")}
      >
        {LANG_OPTIONS_SORTED.map((opt) => {
          const uiCode = uiCodeFromDocCode(opt.code); // ex: "pt-BR" -> "pt"
          return (
            <option key={opt.code} value={uiCode}>
              {getLocalizedLangLabel(opt.code, uiLang)}
            </option>
          );
        })}
      </select>
    </div>
  );
}
