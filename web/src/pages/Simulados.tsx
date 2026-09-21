import { useEffect, useState } from "react";
import { api } from "../api/client";
import { formatMinutes, localISO } from "../lib/date";

const pct = (c: number, t: number) => (t > 0 ? Math.round((c / t) * 100) : 0);

function Trend({ points }: { points: { x: string; y: number }[] }) {
  if (points.length < 2) return <p className="hint">Registre pelo menos 2 simulados para ver a evolução.</p>;
  const W = 320;
  const H = 90;
  const coords = points.map((p, i) => [8 + (i * (W - 16)) / (points.length - 1), 8 + (1 - p.y / 100) * (H - 16)]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="trend" role="img" aria-label="Evolução do desempenho nos simulados">
      <line x1="8" x2={W - 8} y1={8 + (H - 16) * 0.2} y2={8 + (H - 16) * 0.2} className="trend-grid" />
      <polyline points={coords.map((c) => c.join(",")).join(" ")} className="trend-line" />
      {coords.map((c, i) => (
        <circle key={i} cx={c[0]} cy={c[1]} r="4" className="trend-dot">
          <title>{`${points[i].x}: ${points[i].y}%`}</title>
        </circle>
      ))}
    </svg>
  );
}

export default function Simulados() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(localISO(new Date()));
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("MULTIPLA");
  const [duration, setDuration] = useState(0);
  const [total, setTotal] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [blank, setBlank] = useState(0);

  const load = () =>
    api.getSimulados().then((r) => {
      setList(r);
      setLoading(false);
    });
  useEffect(() => {
    load();
  }, []);

  const wrong = Math.max(0, total - correct - blank);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.createSimulado({ date, title, kind, durationMin: duration, total, correct, blank });
      setTitle("");
      setTotal(0);
      setCorrect(0);
      setBlank(0);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Remover este simulado?")) return;
    await api.deleteSimulado(id);
    await load();
  }

  if (loading) return <p className="loading">Carregando...</p>;

  const chrono = [...list].reverse();
  const last = list[0];
  const avg = list.length ? Math.round(list.reduce((a, s) => a + pct(s.correct, s.total), 0) / list.length) : null;

  return (
    <div className="simulados-page">
      <div>
        <h2>Simulados</h2>
        <p className="subtitle">Registre cada prova simulada e acompanhe a evolução. Em provas Certo/Errado, cada erro anula um acerto (nota líquida).</p>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <span>Realizados</span>
          <strong>{list.length}</strong>
        </div>
        <div className="stat-card">
          <span>Último simulado</span>
          <strong>{last ? `${pct(last.correct, last.total)}%` : "—"}</strong>
          {last && (
            <small>
              {last.correct} acertos · {last.blank} em branco · {last.wrong} erros
            </small>
          )}
        </div>
        <div className="stat-card">
          <span>Média</span>
          <strong>{avg === null ? "—" : `${avg}%`}</strong>
        </div>
        <div className="stat-card trend-card">
          <span>Evolução</span>
          <Trend points={chrono.map((s) => ({ x: s.date, y: pct(s.correct, s.total) }))} />
        </div>
      </div>

      <form className="panel event-form" onSubmit={add}>
        <label>
          Data
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="grow">
          Título
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Simulado 03 — banca X" required />
        </label>
        <label>
          Tipo
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="MULTIPLA">Múltipla escolha</option>
            <option value="CERTO_ERRADO">Certo/Errado</option>
          </select>
        </label>
        <label>
          Tempo (min)
          <input type="number" min={0} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </label>
        <label>
          Questões
          <input type="number" min={0} value={total} onChange={(e) => setTotal(Number(e.target.value))} required />
        </label>
        <label>
          Acertos
          <input type="number" min={0} value={correct} onChange={(e) => setCorrect(Number(e.target.value))} />
        </label>
        <label>
          Em branco
          <input type="number" min={0} value={blank} onChange={(e) => setBlank(Number(e.target.value))} />
        </label>
        <div className="calc-wrong">
          <span>Erros</span>
          <b>{wrong}</b>
        </div>
        <button className="primary" type="submit">
          Registrar
        </button>
      </form>
      {error && <div className="error">{error}</div>}

      <div className="panel table-scroll">
        <table className="edital-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Simulado</th>
              <th>Tipo</th>
              <th>Tempo</th>
              <th>Questões</th>
              <th>Acertos</th>
              <th>Branco</th>
              <th>Erros</th>
              <th>%</th>
              <th>Líquido</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const p = pct(s.correct, s.total);
              return (
                <tr key={s.id}>
                  <td>{new Date(s.date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                  <td>{s.title}</td>
                  <td>{s.kind === "CERTO_ERRADO" ? "Certo/Errado" : "Múltipla"}</td>
                  <td>{s.duration_min ? formatMinutes(s.duration_min) : "—"}</td>
                  <td>{s.total}</td>
                  <td className="ok">{s.correct}</td>
                  <td>{s.blank}</td>
                  <td className="bad">{s.wrong}</td>
                  <td>
                    <span className={`perf ${p >= 80 ? "good" : p >= 60 ? "mid" : "low"}`}>{p}%</span>
                  </td>
                  <td>{s.kind === "CERTO_ERRADO" ? s.correct - s.wrong : "—"}</td>
                  <td>
                    <button className="icon-btn danger" onClick={() => remove(s.id)} aria-label="Remover simulado">
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={11}>Nenhum simulado registrado ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
