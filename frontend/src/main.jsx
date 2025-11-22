import React from "react";
import "./i18n";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import App from "./App";
import AuthProvider from "@/contexts/AuthContext";
import RequireAuth from "@/routes/RequireAuth";
import ToastProvider from "@/ui/Toast";
import Login from "@/pages/Login";
import Logout from "@/pages/Logout";
import Jobs from "@/pages/Jobs";
import Glossaries from "@/pages/Glossaries";
import NotFound from "@/pages/NotFound";
import Recover from "@/pages/Recover";
import Reset from "@/pages/Reset";

const Home = () => <div className="p-6">Bem-vindo 👋</div>;
const Settings = () => <div>Settings</div>;

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: "login", element: <Login /> },
      { path: "logout", element: <Logout /> },
      { path: "recover", element: <Recover /> },
      { path: "reset", element: <Reset /> },
      {
        element: <RequireAuth />,
        children: [
          { path: "jobs", element: <Jobs /> },
          { path: "glossaries", element: <Glossaries /> },
          { path: "settings", element: <Settings /> },
        ],
      },

      { path: "*", element: <NotFound /> },
    ],
  },
]);


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);

