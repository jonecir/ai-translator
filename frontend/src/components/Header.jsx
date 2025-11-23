import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoUrl from "@/assets/logo.svg";
import { Sun, Moon } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function Header() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [menuUser, setMenuUser] = useState(false);

  // Dark mode: inicializa estado considerando localStorage + SO
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;

    const stored = localStorage.getItem("theme");
    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    const prefersDark = !!mql?.matches;

    const initial = stored ?? (prefersDark ? "dark" : "light");
    const enabled = initial === "dark";

    document.documentElement.classList.toggle("dark", enabled);
    return enabled;
  });

  const { user, isLogged, logout } = useAuth();

  // Sincroniza com mudanças de preferência do SO (sem setState direto no corpo do effect)
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mql) return undefined;

    const onChange = (e) => {
      // Se o usuário já escolheu manualmente o tema, não sobrescreve
      if (localStorage.getItem("theme")) return;

      const enabled = e.matches;
      document.documentElement.classList.toggle("dark", enabled);
      setIsDark(enabled);
    };

    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  const handleLogout = () => logout(true);

  const routes = [
    { to: ".", label: t("nav.home"), end: true },
    { to: "jobs", label: t("nav.jobs") },
    { to: "glossaries", label: t("nav.glossaries") },
  ];

  const linkBase =
    "px-3 py-2 rounded-xl text-sm font-medium transition hover:bg-black/5 dark:hover:bg-white/10";
  const linkActive =
    "bg-black/10 dark:bg-white/20 shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,.15)]";

  const avatarUrl =
    user?.avatar ||
    `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(user?.email || "guest")}`;

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="h-14 flex items-center gap-3">
          {/* logo + título */}
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="AI Translator" className="h-6 w-6" />
            <span className="font-semibold tracking-tight">AI Translator</span>
          </div>

          <div className="flex-1" />

          {/* navegação desktop */}
          <nav className="hidden sm:flex items-center gap-2">
            {routes.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cx(linkBase, isActive && linkActive)}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* ações à direita (desktop) */}
          <div className="hidden sm:flex items-center gap-2 relative">
            <LanguageSwitcher />

            <button
              onClick={toggleTheme}
              className="h-9 w-9 rounded-lg border border-black/10 dark:border-white/10 grid place-items-center hover:bg-black/5 dark:hover:bg-white/10"
              title={t("nav.themeToggle")}
              aria-label={t("nav.themeToggle")}
              aria-pressed={isDark}
            >
              {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            {isLogged ? (
              <>
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200/50">
                  {t("auth.logged")}
                </span>
                <button
                  onClick={() => setMenuUser((v) => !v)}
                  className="h-9 w-9 rounded-full overflow-hidden border border-black/10 dark:border-white/10"
                  title={user?.email || "Usuário"}
                >
                  <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                </button>

                {/* menu do usuário */}
                {menuUser && (
                  <div className="absolute right-0 top-12 w-56 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-md p-2">
                    <div className="px-2 py-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {user?.name || "Usuário"}
                      <br />
                      {user?.email || ""}
                    </div>
                    <hr className="my-1 border-black/10 dark:border-white/10" />
                    <NavLink
                      to="settings"
                      onClick={() => setMenuUser(false)}
                      className="block w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-sm"
                    >
                      {t("ui.settings")}
                    </NavLink>
                    <button
                      onClick={() => {
                        setMenuUser(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-sm"
                    >
                      {t("auth.logout")}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <NavLink
                to="login"
                className="px-3 py-2 rounded-xl text-sm border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
              >
                {t("auth.login")}
              </NavLink>
            )}
          </div>

          {/* botão menu mobile */}
          <button
            className="sm:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg border border-black/10 dark:border-white/10"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("nav.openMenu")}
          >
            ☰
          </button>
        </div>

        {/* drawer mobile */}
        {open ? (
          <div className="sm:hidden pb-3">
            <nav className="grid gap-1">
              {routes.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    [
                      "px-3 py-2 rounded-lg",
                      isActive
                        ? "bg-black/10 dark:bg-white/20"
                        : "hover:bg-black/5 dark:hover:bg-white/10",
                    ].join(" ")
                  }
                >
                  {label}
                </NavLink>
              ))}

              <div className="flex items-center gap-2 pt-1">
                <LanguageSwitcher />

                <button
                  onClick={() => {
                    toggleTheme();
                    setOpen(false);
                  }}
                  className="h-9 w-9 rounded-lg border border-black/10 dark:border-white/10 grid place-items-center hover:bg-black/5 dark:hover:bg-white/10"
                  title={t("nav.themeToggle")}
                  aria-label={t("nav.themeToggle")}
                >
                  <span className="text-lg select-none">{isDark ? "🌙" : "☀️"}</span>
                </button>

                {isLogged ? (
                  <>
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200/50">
                      {t("nav.logged")}
                    </span>
                    <button
                      onClick={() => {
                        handleLogout();
                        setOpen(false);
                      }}
                      className="px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      {t("nav.logout")}
                    </button>
                  </>
                ) : (
                  <NavLink
                    to="login"
                    onClick={() => setOpen(false)}
                    className="px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    {t("nav.login")}
                  </NavLink>
                )}
              </div>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
