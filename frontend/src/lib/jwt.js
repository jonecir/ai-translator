// Decodifica payload sem verificar assinatura (suficiente para exp local)
export function parseJwt(token) {
  try {
    const part = token.split(".")[1];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

export function getExpMs(token) {
  const p = parseJwt(token);
  if (!p?.exp) return 0;
  return p.exp * 1000;
}
