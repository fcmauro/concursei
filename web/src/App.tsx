import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Board from "./pages/Board";
import Edital from "./pages/Edital";
import Stats from "./pages/Stats";
import Guia from "./pages/Guia";
import Painel from "./pages/Painel";
import Revisoes from "./pages/Revisoes";
import Rotina from "./pages/Rotina";
import Simulados from "./pages/Simulados";
import Erros from "./pages/Erros";
import Plano from "./pages/Plano";
import Historico from "./pages/Historico";
import Importar from "./pages/Importar";
import Admin from "./pages/Admin";
import Cronometro from "./components/Cronometro";
import Lembretes from "./components/Lembretes";
import "./app.css";

const MAIN_NAV = [
  { to: "/painel", label: "Painel" },
  { to: "/board", label: "Diário" },
  { to: "/plano", label: "Plano" },
  { to: "/revisoes", label: "Revisões" },
  { to: "/edital", label: "Edital" },
];

const MORE_NAV = [
  { to: "/rotina", label: "Rotina" },
  { to: "/simulados", label: "Simulados" },
  { to: "/erros", label: "Caderno de erros" },
  { to: "/historico", label: "Histórico" },
  { to: "/stats", label: "Horas por matéria" },
  { to: "/importar", label: "Importar" },
  { to: "/guia", label: "Guia de estudo" },
];

const PAGES: { path: string; element: React.ReactNode }[] = [
  { path: "/painel", element: <Painel /> },
  { path: "/board", element: <Board /> },
  { path: "/plano", element: <Plano /> },
  { path: "/revisoes", element: <Revisoes /> },
  { path: "/edital", element: <Edital /> },
  { path: "/rotina", element: <Rotina /> },
  { path: "/simulados", element: <Simulados /> },
  { path: "/erros", element: <Erros /> },
  { path: "/historico", element: <Historico /> },
  { path: "/stats", element: <Stats /> },
  { path: "/importar", element: <Importar /> },
  { path: "/admin", element: <Admin /> },
  { path: "/guia", element: <Guia /> },
];

function NavMore({ pathname, items }: { pathname: string; items: { to: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = items.some((m) => m.to === pathname);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`nav-more ${active ? "active" : ""}`}>
      <button type="button" className="nav-more-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Mais <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="nav-more-menu" role="menu">
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} role="menuitem" className={linkClass}>
              {n.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");

function PrivateLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title">Concursei</div>
        <nav>
          {MAIN_NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
          <NavMore
            pathname={location.pathname}
            items={user?.isAdmin ? [...MORE_NAV, { to: "/admin", label: "Administração" }] : MORE_NAV}
          />
        </nav>
        <div className="app-user">
          {user.examName && <em className="exam-name">{user.examName}</em>}
          <span>{user.name}</span>
          <button onClick={logout}>Sair</button>
        </div>
      </header>
      <main>{children}</main>
      <Cronometro />
      <Lembretes />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          {PAGES.map((p) => (
            <Route key={p.path} path={p.path} element={<PrivateLayout>{p.element}</PrivateLayout>} />
          ))}
          <Route path="*" element={<Navigate to="/painel" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
