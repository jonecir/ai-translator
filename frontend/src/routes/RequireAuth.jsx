import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function RequireAuth() {
  const { isLogged, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <div className="grid place-items-center py-20">Carregando…</div>;
  if (!isLogged) return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;   // <- importante
}
