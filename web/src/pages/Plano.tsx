import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { TYPE_LABEL } from "../components/SessionCard";
import { formatMinutes, localISO, SHORT_DOW } from "../lib/date";

const addDaysISO = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return localISO(d);
};

const addHours = (start: string, hours: number) => {
  const [h, m] = start.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + Math.round(hours * 60));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export default function Plano() {
  const today = localISO(new Date());
  const [loading, setLoading] = useState(true);
  const [hasWindows, setHasWindows] = useState(false);
  const [weeklyMin, setWeeklyMin] = useState(0);
  const [until, setUntil] = useState(addDaysISO(today, 84));
  const [examDate, setExamDate] = useState<string | null>(null);
  const [setAsExam, setSetAsExam] = useState(false);
  const [replace, setReplace] = useState(true);
  const [preview, setPreview] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const [wdH, setWdH] = useState(2);
  const [wdStart, setWdStart] = useState("19:00");
  const [satH, setSatH] = useState(4);
  const [satStart, setSatStart] = useState("08:00");
  const [sunH, setSunH] = useState(4);
  const [sunStart, setSunStart] = useState("08:00");

  async function loadBase() {
    const [av, me] = await Promise.all([api.getAvailability(), api.getMe()]);
    setHasWindows(av.length > 0);
    setWeeklyMin(
      av.reduce((a: number, w: any) => {
        const [h1, m1] = w.start_time.split(":").map(Number);
        const [h2, m2] = w.end_time.split(":").map(Number);
        return a + (h2 * 60 + m2 - (h1 * 60 + m1));
      }, 0)
    );
    setExamDate(me.examDate);
    if (me.examDate && me.examDate > today) setUntil(me.examDate);
    setLoading(false);
  }

  useEffect(() => {
    loadBase();
  }, []);

  async function quickSetup() {
    setError(null);
    const windows: { weekday: number; start: string; end: string }[] = [];
    if (wdH > 0) for (const wd of [1, 2, 3, 4, 5]) windows.push({ weekday: wd, start: wdStart, end: addHours(wdStart, wdH) });
    if (satH > 0) windows.push({ weekday: 6, start: satStart, end: addHours(satStart, satH) });
    if (sunH > 0) windows.push({ weekday: 0, start: sunStart, end: addHours(sunStart, sunH) });
    try {
      await api.saveAvailability(windows);
      await loadBase();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function run(apply: boolean) {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const r = await api.generatePlan({ today, until, apply, replace });
      setPreview(r);
      if (apply) {
        if (setAsExam) {
          await api.updateMe({ examDate: until });
          setExamDate(until);
        }
        setDone(`${r.created} sessões criadas no Diário.`);
        window.dispatchEvent(new Event("concursei:sessions"));
      }
    } catch (e: any) {
      setError(e.message);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="loading">Carregando...</p>;

  const s = preview?.summary;

  return (
    <div className="plano-page">
      <div>
        <h2>Gerar plano de estudos</h2>
        <p className="subtitle">
          O app distribui os assuntos do seu edital pelos dias em que você pode estudar, mistura as matérias de acordo com o peso, programa as revisões (24h, 7, 15 e 30 dias) e encaixa simulados. Não usa IA: é um cálculo a partir dos seus horários, da data-alvo e dos assuntos cadastrados.
        </p>
      </div>

      {!hasWindows && (
        <section className="panel">
          <h3>1. Quanto você pode estudar?</h3>
          <p className="hint">Você ainda não definiu horários. Configuração rápida (dá para ajustar depois na aba Rotina):</p>
          <div className="quick-grid">
            <div className="quick-row">
              <strong>Segunda a sexta</strong>
              <label>
                horas por dia
                <input type="number" min={0} max={12} step={0.5} value={wdH} onChange={(e) => setWdH(Number(e.target.value))} />
              </label>
              <label>
                a partir das
                <input type="time" value={wdStart} onChange={(e) => setWdStart(e.target.value)} />
              </label>
            </div>
            <div className="quick-row">
              <strong>Sábado</strong>
              <label>
                horas
                <input type="number" min={0} max={12} step={0.5} value={satH} onChange={(e) => setSatH(Number(e.target.value))} />
              </label>
              <label>
                a partir das
                <input type="time" value={satStart} onChange={(e) => setSatStart(e.target.value)} />
              </label>
            </div>
            <div className="quick-row">
              <strong>Domingo</strong>
              <label>
                horas
                <input type="number" min={0} max={12} step={0.5} value={sunH} onChange={(e) => setSunH(Number(e.target.value))} />
              </label>
              <label>
                a partir das
                <input type="time" value={sunStart} onChange={(e) => setSunStart(e.target.value)} />
              </label>
            </div>
          </div>
          <div className="win-footer">
            <span>
              Total: <b>{formatMinutes(Math.round((wdH * 5 + satH + sunH) * 60))}</b> por semana
            </span>
            <span className="spacer" />
            <button className="primary" onClick={quickSetup}>
              Salvar horários
            </button>
          </div>
        </section>
      )}

      {hasWindows && (
        <section className="panel">
          <h3>1. Seus horários</h3>
          <p className="hint" style={{ margin: 0 }}>
            Você tem <b>{formatMinutes(weeklyMin)}</b> de estudo por semana. Os compromissos cadastrados na Rotina são descontados na hora de gerar.{" "}
            <Link className="link-btn" to="/rotina">
              Editar na aba Rotina →
            </Link>
          </p>
        </section>
      )}

      <section className="panel">
        <h3>2. Até quando?</h3>
        <div className="event-form">
          <label>
            Data-alvo (prova ou fim do plano)
            <input type="date" min={addDaysISO(today, 7)} value={until} onChange={(e) => { setUntil(e.target.value); setPreview(null); setDone(null); }} />
          </label>
          {[30, 60, 90, 120].map((d) => (
            <button key={d} type="button" className="ghost-btn" onClick={() => { setUntil(addDaysISO(today, d)); setPreview(null); setDone(null); }}>
              +{d} dias
            </button>
          ))}
        </div>
        <label className="inline-check">
          <input type="checkbox" checked={setAsExam} onChange={(e) => setSetAsExam(e.target.checked)} />
          usar esta data como data da prova {examDate ? `(hoje: ${new Date(examDate + "T00:00:00").toLocaleDateString("pt-BR")})` : ""}
        </label>
        <label className="inline-check">
          <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
          substituir o plano automático anterior (o que você planejou à mão e o que já concluiu fica como está)
        </label>
        <div className="win-footer">
          <span className="spacer" />
          <button className="ghost-btn" onClick={() => run(false)} disabled={busy || !hasWindows}>
            {busy ? "Calculando..." : "Simular plano"}
          </button>
        </div>
        {error && <div className="error">{error}</div>}
      </section>

      {s && (
        <>
          <div className="stat-cards">
            <div className="stat-card">
              <span>Assuntos planejados</span>
              <strong>
                {s.topicsPlanned} de {s.topicsPending}
              </strong>
              <small>{s.topicsUnplanned > 0 ? `${s.topicsUnplanned} não cabem até a data` : "todos os pendentes cabem"}</small>
            </div>
            <div className="stat-card">
              <span>Horas de estudo</span>
              <strong>{formatMinutes(s.studyMinutes)}</strong>
              <small>em {s.studyDays} dias</small>
            </div>
            <div className="stat-card">
              <span>Revisões</span>
              <strong>{s.reviews}</strong>
              <small>{formatMinutes(s.reviewMinutes)} no total</small>
            </div>
            <div className="stat-card">
              <span>Simulados</span>
              <strong>{s.simulados}</strong>
              <small>{formatMinutes(s.simuladoMinutes)} no total</small>
            </div>
          </div>

          {s.topicsUnplanned > 0 && (
            <div className="error">
              {s.topicsUnplanned} assunto(s) não cabem até {new Date(s.until + "T00:00:00").toLocaleDateString("pt-BR")}. Aumente as horas na Rotina ou escolha uma data mais distante — o app reserva as últimas semanas para revisão e simulados.
            </div>
          )}
          {s.reviewsUnplaced > 0 && (
            <p className="hint">{s.reviewsUnplaced} revisão(ões) ficariam depois da data-alvo e não foram programadas.</p>
          )}
          {s.leftoverMinutes >= 60 && <p className="hint">Sobram {formatMinutes(s.leftoverMinutes)} livres nas suas janelas — bom para reforçar com questões.</p>}
          {s.replacing > 0 && <p className="hint">Ao aplicar, {s.replacing} sessão(ões) do plano automático anterior serão substituídas.</p>}

          <div className="painel-grid">
            <section className="panel">
              <h3>Horas por matéria</h3>
              <div className="table-scroll">
                <table className="edital-table">
                  <thead>
                    <tr>
                      <th>Matéria</th>
                      <th>Assuntos</th>
                      <th>Tempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.perSubject.map((p: any) => (
                      <tr key={p.name}>
                        <td>
                          <span className="dot" style={{ background: p.color }} /> {p.name}
                        </td>
                        <td>{p.topics}</td>
                        <td>{formatMinutes(p.minutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <h3>Primeiros dias</h3>
              <div className="sample-list">
                {preview.sample.map((d: any) => (
                  <div key={d.date} className="sample-day">
                    <strong>
                      {SHORT_DOW[new Date(d.date + "T00:00:00").getDay()]} {new Date(d.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </strong>
                    <div>
                      {d.items.map((i: any, k: number) => (
                        <span key={k} className="sample-chip" style={{ borderLeftColor: i.color }} title={i.topic || ""}>
                          <b>{TYPE_LABEL[i.type] || i.type}</b> {i.subject}
                          <em>{formatMinutes(i.minutes)}</em>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="win-footer">
            {done ? (
              <>
                <span className="ok-text">✔ {done}</span>
                <Link className="primary" to="/board" style={{ textDecoration: "none", padding: "12px 20px" }}>
                  Abrir Diário
                </Link>
              </>
            ) : (
              <>
                <span className="spacer" />
                <button className="primary" onClick={() => run(true)} disabled={busy}>
                  {busy ? "Aplicando..." : "Aplicar no Diário"}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
