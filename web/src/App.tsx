import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Board from "./pages/Board";
import Edital from "./pages/Edital";
import Stats from "./pages/Stats";
import "./app.css";

function PrivateLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title">Cronograma de Estudos</div>
        <nav>
          <NavLink to="/board" className={({ isActive }) => (isActive ? "active" : "")}>
            Diário
          </NavLink>
          <NavLink to="/edital" className={({ isActive }) => (isActive ? "active" : "")}>
            Edital
          </NavLink>
          <NavLink to="/stats" className={({ isActive }) => (isActive ? "active" : "")}>
            Horas
          </NavLink>
        </nav>
        <div className="app-user">
          <span>{user.name}</span>
          <button onClick={logout}>Sair</button>
        </div>
      </header>
      <main>{children}</main>
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
          <Route path="*" element={<Navigate to="/board" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
