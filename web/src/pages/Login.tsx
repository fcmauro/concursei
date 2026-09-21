import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      navigate("/board");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Cronograma de Estudos</h1>
        <p className="subtitle">Concurso MPMS — Analista TI / Desenvolvimento de Sistemas</p>

        <div className="tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            Entrar
          </button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
            Criar conta
          </button>
        </div>

        {mode === "register" && (
          <label>
            Nome
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        {error && <div className="error">{error}</div>}

        <button type="submit" className="primary" disabled={loading}>
          {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta e gerar edital"}
        </button>
        {mode === "register" && (
          <p className="hint">Ao criar a conta, o edital do cargo (matérias + assuntos) já vem pré-carregado.</p>
        )}
      </form>
    </div>
  );
}
