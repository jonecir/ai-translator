// src/i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import de from "./locales/de/common.json";
import en from "./locales/en/common.json";
import es from "./locales/es/common.json";
import fr from "./locales/fr/common.json";
import it from "./locales/it/common.json";
import ja from "./locales/ja/common.json";
import nl from "./locales/nl/common.json";
import pl from "./locales/pl/common.json";
import pt from "./locales/pt/common.json";
import ro from "./locales/ro/common.json";
import zhCN from "./locales/zh-CN/common.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { common: de },
      en: { common: en },
      es: { common: es },
      fr: { common: fr },
      it: { common: it },
      ja: { common: ja },
      nl: { common: nl },
      pl: { common: pl },
      pt: { common: pt },
      ro: { common: ro },
      zh: { common: zhCN },
      "zh-CN": { common: zhCN },
      "zh-cn": { common: zhCN },
    },
    // linguagens suportadas e fallback
    supportedLngs: [
      "de",
      "en",
      "es",
      "fr",
      "ja",
      "it",
      "nl",
      "pl",
      "pt",
      "ro",
      "zh",
      "zh-cn",
      "zh-CN",
    ],
    nonExplicitSupportedLngs: true, // trata en-US como en
    lowerCaseLng: false, // normaliza “ZH-CN” -> “zh-cn”
    cleanCode: false, // normaliza separadores etc.
    load: "currentOnly",
    fallbackLng: "pt",
    ns: ["common"],
    defaultNS: "common",
    interpolation: { escapeValue: false },

    detection: {
      order: ["querystring", "localStorage", "navigator"],
      lookupQuerystring: "lang",
      caches: ["localStorage"], // persiste a escolha
      // cleanCode: true // (opcional) normaliza códigos p/ minúsculas
    },

    // debug: true,
  });

export default i18n;
