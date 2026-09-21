import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Board from "./pages/Board";
import Edital from "./pages/Edital";
import Stats from "./pages/Stats";
import Guia from "./pages/Guia";
import Painel from "./pages/Painel";
import Revisoes from "./pages/Revisoes";
import Cronometro from "./components/Cronometro";
import Rotina from "./pages/Rotina";
import Simulados from "./pages/Simulados";
import Erros from "./pages/Erros";
import Plano from "./pages/Plano";
import "./app.css";

function PrivateLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title">Concursei</div>
        <nav>
          <NavLink to="/painel" className={({ isActive }) => (isActive ? "active" : "")}>
            Painel
          </NavLink>
          <NavLink to="/board" className={({ isActive }) => (isActive ? "active" : "")}>
            Diário
          </NavLink>
          <NavLink to="/plano" className={({ isActive }) => (isActive ? "active" : "")}>
            Plano
          </NavLink>
          <NavLink to="/revisoes" className={({ isActive }) => (isActive ? "active" : "")}>
            Revisões
          </NavLink>
          <NavLink to="/rotina" className={({ isActive }) => (isActive ? "active" : "")}>
            Rotina
          </NavLink>
          <NavLink to="/edital" className={({ isActive }) => (isActive ? "active" : "")}>
            Edital
          </NavLink>
          <NavLink to="/simulados" className={({ isActive }) => (isActive ? "active" : "")}>
            Simulados
          </NavLink>
          <NavLink to="/erros" className={({ isActive }) => (isActive ? "active" : "")}>
            Erros
          </NavLink>
          <NavLink to="/stats" className={({ isActive }) => (isActive ? "active" : "")}>
            Horas
          </NavLink>
          <NavLink to="/guia" className={({ isActive }) => (isActive ? "active" : "")}>
            Guia
          </NavLink>
        </nav>
        <div className="app-user">
          {user.examName && <em className="exam-name">{user.examName}</em>}
          <span>{user.name}</span>
          <button onClick={logout}>Sair</button>
        </div>
      </header>
      <main>{children}</main>
      <Cronometro />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/painel"
            element={
              <PrivateLayout>
                <Painel />
              </PrivateLayout>
            }
          />
          <Route
            path="/revisoes"
            element={
              <PrivateLayout>
                <Revisoes />
              </PrivateLayout>
            }
          />
          <Route
            path="/board"
            element={
              <PrivateLayout>
                <Board />
              </PrivateLayout>
            }
          />
          <Route
            path="/edital"
            element={
              <PrivateLayout>
                <Edital />
              </PrivateLayout>
            }
          />
          <Route
            path="/stats"
            element={
              <PrivateLayout>
                <Stats />
              </PrivateLayout>
            }
          />
          <Route
            path="/guia"
            element={
              <PrivateLayout>
                <Guia />
              </PrivateLayout>
            }
          />
          <Route
            path="/rotina"
            element={
              <PrivateLayout>
                <Rotina />
              </PrivateLayout>
            }
          />
          <Route
            path="/simulados"
            element={
              <PrivateLayout>
                <Simulados />
              </PrivateLayout>
            }
          />
          <Route
            path="/erros"
            element={
              <PrivateLayout>
                <Erros />
              </PrivateLayout>
            }
          />
          <Route
            path="/plano"
            element={
              <PrivateLayout>
                <Plano />
              </PrivateLayout>
            }
          />
          <Route path="*" element={<Navigate to="/painel" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
