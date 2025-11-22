import { createContext, useContext, useState } from "react";

const ToastCtx = createContext(null);

export function useToast() {
  return useContext(ToastCtx); // retorna { push } ou null se faltar provider
}

export default function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const push = ({ title, desc = "", tone = "ok", ttl = 3500 }) => {
    const id = crypto.randomUUID();
    setItems((xs) => [...xs, { id, title, desc, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((i) => i.id !== id)), ttl);
  };

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed right-3 top-3 z-50 grid gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={[
              "min-w-[260px] rounded-xl border px-3 py-2 shadow-md bg-white/95 backdrop-blur",
              t.tone === "error"
                ? "border-red-300 text-red-800"
                : "border-emerald-300 text-emerald-800",
              "dark:bg-neutral-900/95 dark:backdrop-blur",
            ].join(" ")}
          >
            <div className="font-medium">{t.title}</div>
            {t.desc && <div className="text-xs opacity-80">{t.desc}</div>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
