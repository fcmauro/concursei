import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [examName, setExamName] = useState("");
  const [template, setTemplate] = useState("blank");
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
        await register(email, password, name, examName, template);
      }
      navigate("/painel");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Concursei</h1>
        <p className="subtitle">Organize a preparação para qualquer concurso: edital, diário, revisões e horas.</p>

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
        {mode === "register" && (
          <>
            <label>
              Concurso / cargo
              <input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="Ex.: TJ-SP — Escrevente" />
            </label>
            <label>
              Edital inicial
              <select value={template} onChange={(e) => setTemplate(e.target.value)}>
                <option value="blank">Em branco (eu cadastro as matérias)</option>
                <option value="mpms405">Modelo: MPMS — Analista TI / Desenvolvimento de Sistemas</option>
              </select>
            </label>
          </>
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
          {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
        </button>
        {mode === "register" && (
          <p className="hint">Você pode começar em branco e montar matérias e assuntos do seu edital na aba Edital, ou partir de um modelo pronto.</p>
        )}
      </form>
    </div>
  );
}
