// src/App.jsx
import { Outlet } from "react-router-dom";
import Header from "./components/Header";

export default function App() {
  return (
    <div className="min-h-dvh text-neutral-900 dark:text-neutral-100">
      <Header />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
