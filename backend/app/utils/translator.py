# backend/app/utils/translator.py
import os
import json
from typing import Sequence

PROVIDER = os.getenv("TRANSLATOR_PROVIDER", "").lower()  # "openai" | "deepl" | "azure"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

DEEPL_API_KEY = os.getenv("DEEPL_API_KEY")
DEEPL_API_URL = os.getenv("DEEPL_API_URL", "https://api.deepl.com/v2/translate")

AZURE_KEY = os.getenv("AZURE_TRANSLATOR_KEY")
AZURE_REGION = os.getenv("AZURE_TRANSLATOR_REGION", "eastus")
AZURE_ENDPOINT = os.getenv(
    "AZURE_TRANSLATOR_ENDPOINT", "https://api.cognitive.microsofttranslator.com"
)

__all__ = ["translate_text", "TranslatorError"]


class TranslatorError(Exception):
    pass


def translate_text(texts: Sequence[str], source_lang: str, target_lang: str) -> list[str]:
    """
    Recebe lista de textos e devolve lista traduzida, na mesma ordem.
    Se nenhum provedor estiver configurado, retorna os próprios textos (no-op).
    """
    if not texts:
        return []
    if PROVIDER == "openai":
        return _translate_openai(texts, source_lang, target_lang)
    if PROVIDER == "deepl":
        return _translate_deepl(texts, source_lang, target_lang)
    if PROVIDER == "azure":
        return _translate_azure(texts, source_lang, target_lang)
    # fallback: sem tradução
    return list(texts)


# --------- Translation Providers ---------


def _translate_openai(texts: Sequence[str], source: str, target: str) -> list[str]:
    import requests

    system = (
        "You are a professional translator. Translate the user text from "
        f"{source} to {target}. Keep meaning, tone and placeholders. "
        "Return ONLY the translations, one per block, preserving order. "
        "Use the separator line exactly as '----' between items."
    )
    user = "\n----\n".join(texts)
    r = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0,
        },
        timeout=60,
    )
    if r.status_code == 200:
        content = r.json()["choices"][0]["message"]["content"]
        return [s.strip() for s in content.split("\n----\n")]

    # ---------- Quota / 429: tenta fallback ----------
    if r.status_code == 429:
        # 1) DeepL se existir
        if DEEPL_API_KEY:
            try:
                return _translate_deepl(texts, source, target)
            except Exception:
                pass
        # 2) Azure se existir
        if AZURE_KEY:
            try:
                return _translate_azure(texts, source, target)
            except Exception:
                pass
        # 3) Último recurso: mantém texto original (no-op)
        return list(texts)

    # Outros erros -> exceção explícita
    raise TranslatorError(f"openai error: {r.status_code} {r.text}")


def _deepl_normalize_langs(source: str | None, target: str | None) -> tuple[str | None, str]:
    # upper e unifica separador
    s = (source or "").replace("_", "-").upper()
    t = (target or "").replace("_", "-").upper()

    # Lista de idiomas DeepL (bases) suportados para SOURCE
    bases = {
        "BG",
        "CS",
        "DA",
        "DE",
        "EL",
        "EN",
        "ES",
        "ET",
        "FI",
        "FR",
        "HU",
        "ID",
        "IT",
        "JA",
        "KO",
        "LT",
        "LV",
        "NB",
        "NL",
        "PL",
        "PT",
        "RO",
        "RU",
        "SK",
        "SL",
        "SV",
        "TR",
        "UK",
        "ZH",
    }
    # Lista de TARGET válidos (bases + regionais permitidos)
    target_ok = bases | {"EN-US", "EN-GB", "PT-PT", "PT-BR"}

    # SOURCE: colapsa regionais -> base (PT-BR -> PT, EN-US -> EN, etc.)
    if s:
        if s.startswith("EN"):
            s = "EN"
        elif s.startswith("PT"):
            s = "PT"
        elif "-" in s:
            s = s.split("-")[0]
        if s not in bases:
            s = None  # deixa DeepL autodetectar

    # TARGET: mantém regionais válidos; se não, cai para base
    if t not in target_ok:
        if "-" in t:
            t = t.split("-")[0]
        if t not in bases:
            t = "EN"  # fallback seguro

    return s, t


def _translate_deepl(texts: Sequence[str], source: str, target: str) -> list[str]:
    import requests

    src_norm, tgt_norm = _deepl_normalize_langs(source, target)

    data = {"auth_key": DEEPL_API_KEY, "target_lang": tgt_norm}
    if src_norm:
        data["source_lang"] = src_norm  # só envia se suportado

    # DeepL aceita vários "text" em formulário x-www-form-urlencoded
    payload = []
    for k, v in data.items():
        payload.append((k, v))
    for t in texts:
        payload.append(("text", t))

    r = requests.post(DEEPL_API_URL, data=payload, timeout=60)
    if r.status_code >= 400:
        raise TranslatorError(f"deepl error: {r.status_code} {r.text}")
    j = r.json()
    return [tr["text"] for tr in j["translations"]]


def _translate_azure(texts: Sequence[str], source: str, target: str) -> list[str]:
    import requests, uuid

    route = f"/translate?api-version=3.0&to={target}"
    if source:
        route += f"&from={source}"
    url = AZURE_ENDPOINT.rstrip("/") + route
    body = [{"text": t} for t in texts]
    r = requests.post(
        url,
        headers={
            "Ocp-Apim-Subscription-Key": AZURE_KEY,
            "Ocp-Apim-Subscription-Region": AZURE_REGION,
            "Content-Type": "application/json",
            "X-ClientTraceId": str(uuid.uuid4()),
        },
        data=json.dumps(body),
        timeout=60,
    )
    if r.status_code >= 400:
        raise TranslatorError(f"azure error: {r.status_code} {r.text}")
    data = r.json()
    return [item["translations"][0]["text"] for item in data]
