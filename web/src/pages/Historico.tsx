import { useEffect, useState } from "react";
import { api } from "../api/client";
import { TYPE_LABEL } from "../components/SessionCard";
import type { SessionRow } from "../components/SessionCard";
import { formatMinutes, localISO, SHORT_DOW } from "../lib/date";

const DAYS = 30;

function addDaysISO(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return localISO(d);
}

function Evolution({ byDay }: { byDay: Map<string, { q: number; c: number }> }) {
  const today = localISO(new Date());
  const days = Array.from({ length: DAYS }, (_, i) => addDaysISO(today, i - (DAYS - 1)));
  const W = 720;
  const H = 190;
  const padL = 30;
  const padB = 22;
  const plotH = H - padB - 10;
  const step = (W - padL - 8) / DAYS;
  const maxQ = Math.max(10, ...days.map((d) => byDay.get(d)?.q || 0));
  const line = days
    .map((d, i) => {
      const v = byDay.get(d);
      return v && v.q > 0 ? [padL + i * step + step / 2, 10 + (1 - v.c / v.q) * plotH, Math.round((v.c / v.q) * 100), d] : null;
    })
    .filter(Boolean) as [number, number, number, string][];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="evo" role="img" aria-label="Questões por dia e desempenho nos últimos 30 dias">
      {[0, 50, 100].map((p) => (
        <g key={p}>
          <line x1={padL} x2={W - 8} y1={10 + (1 - p / 100) * plotH} y2={10 + (1 - p / 100) * plotH} className="trend-grid" />
          <text x={padL - 6} y={14 + (1 - p / 100) * plotH} textAnchor="end" className="evo-axis">
            {p}%
          </text>
        </g>
      ))}
      {days.map((d, i) => {
        const q = byDay.get(d)?.q || 0;
        const h = (q / maxQ) * plotH;
        return (
          <g key={d}>
            <rect x={padL + i * step + 3} y={10 + plotH - h} width={Math.max(2, step - 6)} height={h} rx="3" className="evo-bar">
              <title>{`${d}: ${q} questões`}</title>
            </rect>
            {i % 5 === 0 && (
              <text x={padL + i * step + step / 2} y={H - 6} textAnchor="middle" className="evo-axis">
                {d.slice(8)}/{d.slice(5, 7)}
              </text>
            )}
          </g>
        );
      })}
      {line.length > 1 && <polyline points={line.map((p) => `${p[0]},${p[1]}`).join(" ")} className="trend-line" />}
      {line.map((p) => (
        <circle key={p[3]} cx={p[0]} cy={p[1]} r="3.5" className="trend-dot">
          <title>{`${p[3]}: ${p[2]}% de acerto`}</title>
        </circle>
      ))}
    </svg>
  );
}

export default function Historico() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.getDoneSessions().then((r) => {
      setRows(r);
      setLoading(false);
    });

  useEffect(() => {
    load();
    window.addEventListener("concursei:sessions", load);
    return () => window.removeEventListener("concursei:sessions", load);
  }, []);

  if (loading) return <p className="loading">Carregando...</p>;

  const totalMin = rows.reduce((a, s) => a + s.minutes, 0);
  const totalQ = rows.reduce((a, s) => a + s.questions, 0);
  const totalC = rows.reduce((a, s) => a + s.correct, 0);
  const activeDays = new Set(rows.map((s) => s.date)).size;

  const byDay = new Map<string, { q: number; c: number }>();
  const bySubject = new Map<string, { name: string; color: string; min: number }>();
  const groups = new Map<string, SessionRow[]>();
  for (const s of rows) {
    const v = byDay.get(s.date) || { q: 0, c: 0 };
    v.q += s.questions;
    v.c += s.correct;
    byDay.set(s.date, v);
    const b = bySubject.get(s.subject_id) || { name: s.subject_name, color: s.subject_color, min: 0 };
    b.min += s.minutes;
    bySubject.set(s.subject_id, b);
    groups.set(s.date, [...(groups.get(s.date) || []), s]);
  }
  const subjects = [...bySubject.values()].sort((a, b) => b.min - a.min);
  let acc = 0;
  const stops = subjects.map((s) => {
    const from = (acc / (totalMin || 1)) * 100;
    acc += s.min;
    return `${s.color} ${from}% ${(acc / (totalMin || 1)) * 100}%`;
  });
  const dates = [...groups.keys()].sort().reverse();

  return (
    <div className="historico-page">
      <div>
        <h2>Histórico</h2>
        <p className="subtitle">Tudo o que você concluiu, dia a dia, com a evolução dos últimos 30 dias.</p>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <span>Tempo de estudo</span>
          <strong>{formatMinutes(totalMin)}</strong>
        </div>
        <div className="stat-card">
          <span>Questões</span>
          <strong>{totalQ}</strong>
          <small>
            {totalC} acertos · {totalQ - totalC} erros
          </small>
        </div>
        <div className="stat-card">
          <span>Desempenho</span>
          <strong>{totalQ ? `${Math.round((totalC / totalQ) * 100)}%` : "—"}</strong>
        </div>
        <div className="stat-card">
          <span>Dias estudados</span>
          <strong>{activeDays}</strong>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="loading">Nada concluído ainda. Conclua uma sessão no Diário ou use o cronômetro.</p>
      ) : (
        <>
          <div className="painel-grid">
            <section className="panel">
              <h3>Evolução (30 dias)</h3>
              <p className="hint" style={{ margin: 0 }}>
                Barras: questões por dia. Linha: % de acerto do dia.
              </p>
              <Evolution byDay={byDay} />
            </section>
            <section className="panel">
              <h3>Tempo por matéria</h3>
              <div className="donut-wrap">
                <div className="donut" style={{ background: `conic-gradient(${stops.join(", ")})` }} aria-hidden="true">
                  <span>{formatMinutes(totalMin)}</span>
                </div>
                <ul className="legend">
                  {subjects.map((s) => (
                    <li key={s.name}>
                      <i style={{ background: s.color }} />
                      <span>{s.name}</span>
                      <b>{formatMinutes(s.min)}</b>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          <section className="panel">
            <h3>Sessões concluídas</h3>
            {dates.map((date) => {
              const list = groups.get(date)!;
              const d = new Date(date + "T00:00:00");
              return (
                <div key={date} className="hist-day">
                  <div className="hist-day-head">
                    <strong>
                      {SHORT_DOW[d.getDay()]} {d.toLocaleDateString("pt-BR")}
                    </strong>
                    <span>{formatMinutes(list.reduce((a, s) => a + s.minutes, 0))}</span>
                  </div>
                  {list.map((s) => {
                    const p = s.questions ? Math.round((s.correct / s.questions) * 100) : null;
                    return (
                      <div key={s.id} className="hist-row" style={{ borderLeftColor: s.subject_color }}>
                        <span className="hist-main">
                          <b>{s.subject_name}</b>
                          {s.topic_name && <small>{s.topic_name}</small>}
                        </span>
                        <span className="rev-badge">{TYPE_LABEL[s.type] || s.type}</span>
                        <span className="hist-num">{formatMinutes(s.minutes)}</span>
                        <span className="hist-num ok">{s.correct}</span>
                        <span className="hist-num bad">{s.questions - s.correct}</span>
                        <span className="hist-num">{p === null ? "—" : `${p}%`}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
