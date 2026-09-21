import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ExamSettings from "../components/ExamSettings";
import type { MeData } from "../components/ExamSettings";
import { TYPE_LABEL } from "../components/SessionCard";
import type { SessionRow } from "../components/SessionCard";
import { daysUntil, formatMinutes, localISO, SHORT_DOW, weekRange } from "../lib/date";

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);

export default function Painel() {
  const { user, updateUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [today, setToday] = useState<SessionRow[]>([]);
  const [dueReviews, setDueReviews] = useState<SessionRow[]>([]);
  const [settings, setSettings] = useState(false);

  const load = useCallback(async () => {
    const t = localISO(new Date());
    const { from, to } = weekRange();
    const [d, ts, reviews] = await Promise.all([api.getDashboard(t, from, to), api.getSessions(t, t), api.getReviews()]);
    setData(d);
    setToday(ts.filter((s: SessionRow) => s.status !== "POSTPONED"));
    setDueReviews(reviews.filter((s: SessionRow) => s.status === "TODO" && s.date <= t).slice(0, 6));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("concursei:sessions", load);
    return () => window.removeEventListener("concursei:sessions", load);
  }, [load]);

  if (!data) return <p className="loading">Carregando...</p>;

  const left = data.examDate ? daysUntil(data.examDate) : null;
  const desemp = pct(data.totalCorrect, data.totalQuestions);
  const progress = pct(data.topics.mastered, data.topics.total);
  const goalMin = data.goals.hoursWeek * 60;
  const hoursPct = goalMin > 0 ? Math.min(100, Math.round((data.week.minutes / goalMin) * 100)) : 0;
  const qGoal = data.goals.questionsWeek;
  const qPct = qGoal > 0 ? Math.min(100, Math.round((data.week.questions / qGoal) * 100)) : 0;
  const maxDay = Math.max(60, ...data.week.days.map((d: any) => d.minutes));
  const todayIso = localISO(new Date());

  const me: MeData = {
    examName: data.examName,
    examDate: data.examDate,
    goalHoursWeek: data.goals.hoursWeek,
    goalQuestionsWeek: data.goals.questionsWeek,
  };

  return (
    <div className="painel-page">
      <div className="painel-head">
        <div>
          <h2>Olá, {user?.name}</h2>
          <p className="subtitle" style={{ margin: 0 }}>
            {data.examName || "Defina seu concurso"} ·{" "}
            <button className="link-btn" onClick={() => setSettings(true)}>
              editar concurso e metas
            </button>
          </p>
        </div>
        <button className={`countdown ${left === null ? "empty" : ""}`} onClick={() => setSettings(true)}>
          {left === null ? (
            <span>Definir data da prova</span>
          ) : left >= 0 ? (
            <>
              <strong>{left}</strong>
              <span>{left === 1 ? "dia para a prova" : "dias para a prova"}</span>
            </>
          ) : (
            <span>Prova já realizada</span>
          )}
        </button>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <span>Tempo de estudo</span>
          <strong>{formatMinutes(data.totalMinutes)}</strong>
        </div>
        <div className="stat-card">
          <span>Desempenho</span>
          <strong>{desemp === null ? "—" : `${desemp}%`}</strong>
          <small>
            {data.totalCorrect} acertos · {data.totalQuestions - data.totalCorrect} erros
          </small>
        </div>
        <div className="stat-card">
          <span>Progresso no edital</span>
          <strong>{progress === null ? "—" : `${progress}%`}</strong>
          <small>
            {data.topics.mastered} de {data.topics.total} assuntos
          </small>
        </div>
        <div className="stat-card">
          <span>Constância</span>
          <strong>
            {data.streak} {data.streak === 1 ? "dia" : "dias"}
          </strong>
          <small>seguidos estudando</small>
        </div>
      </div>

      <div className="painel-grid">
        <section className="panel">
          <h3>Metas da semana</h3>
          <div className="goal">
            <div className="goal-row">
              <span>Horas</span>
              <span>
                {formatMinutes(data.week.minutes)} / {data.goals.hoursWeek}h
              </span>
            </div>
            <div className="bar">
              <i style={{ width: `${hoursPct}%` }} />
            </div>
          </div>
          <div className="goal">
            <div className="goal-row">
              <span>Questões</span>
              <span>{qGoal > 0 ? `${data.week.questions} / ${qGoal}` : `${data.week.questions} (sem meta)`}</span>
            </div>
            <div className="bar alt">
              <i style={{ width: `${qPct}%` }} />
            </div>
          </div>
          <div className="week-chart" aria-label="Horas estudadas por dia da semana">
            {data.week.days.map((d: any) => (
              <div key={d.date} className={`wc-col ${d.date === todayIso ? "is-today" : ""}`} title={`${d.date}: ${formatMinutes(d.minutes)}, ${d.questions} questões`}>
                <span className="wc-val">{d.minutes ? formatMinutes(d.minutes) : ""}</span>
                <div className="wc-bar">
                  <i style={{ height: `${Math.round((d.minutes / maxDay) * 100)}%` }} />
                </div>
                <span className="wc-day">{SHORT_DOW[new Date(d.date + "T00:00:00").getDay()]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h3>Constância nos estudos</h3>
          <p className="hint" style={{ margin: "0 0 10px" }}>
            Últimos 28 dias. Dia preenchido = teve estudo concluído.
          </p>
          <div className="streak-grid">
            {data.last28.map((d: any) => (
              <span key={d.date} className={d.minutes > 0 ? "on" : ""} title={`${d.date}: ${formatMinutes(d.minutes)}`} />
            ))}
          </div>
          <h3 style={{ marginTop: 22 }}>Revisões de hoje e atrasadas</h3>
          {dueReviews.length === 0 ? (
            <p className="hint">Nenhuma revisão pendente. 🎉</p>
          ) : (
            <ul className="mini-list">
              {dueReviews.map((r) => (
                <li key={r.id}>
                  <i style={{ background: r.subject_color }} />
                  <span>
                    <b>{r.subject_name}</b>
                    <small>
                      {TYPE_LABEL[r.type]} · {r.date < todayIso ? "atrasada" : "hoje"}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link className="link-btn" to="/revisoes">
            Ver todas as revisões ({data.reviews.due} hoje · {data.reviews.overdue} atrasadas) →
          </Link>
        </section>
      </div>

      <section className="panel">
        <h3>Desempenho por matéria</h3>
        <div className="table-scroll">
          <table className="edital-table">
            <thead>
              <tr>
                <th>Matéria</th>
                <th>Tempo</th>
                <th>Questões</th>
                <th>Acertos</th>
                <th>Erros</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {data.perSubject.map((s: any) => (
                <tr key={s.subjectId}>
                  <td>
                    <span className="dot" style={{ background: s.color }} /> {s.name}
                  </td>
                  <td>{formatMinutes(s.minutes)}</td>
                  <td>{s.questions}</td>
                  <td>{s.correct}</td>
                  <td>{s.questions - s.correct}</td>
                  <td>{pct(s.correct, s.questions) === null ? "—" : `${pct(s.correct, s.questions)}%`}</td>
                </tr>
              ))}
              {data.perSubject.length === 0 && (
                <tr>
                  <td colSpan={6}>Cadastre matérias na aba Edital para acompanhar seu desempenho.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>
          Planejamento de hoje <Link className="link-btn" to="/board">abrir Diário →</Link>
        </h3>
        {today.length === 0 ? (
          <p className="hint">Nada planejado para hoje. Adicione sessões no Diário.</p>
        ) : (
          <ul className="mini-list">
            {today.map((s) => (
              <li key={s.id}>
                <i style={{ background: s.subject_color }} />
                <span>
                  <b>{s.subject_name}</b>
                  <small>
                    {TYPE_LABEL[s.type]}
                    {s.topic_name ? ` · ${s.topic_name}` : ""}
                  </small>
                </span>
                <em>{s.status === "DONE" ? `✔ ${formatMinutes(s.minutes)}` : `⏱ ${formatMinutes(s.minutes)}`}</em>
              </li>
            ))}
          </ul>
        )}
      </section>

      {settings && (
        <ExamSettings
          initial={me}
          onClose={() => setSettings(false)}
          onSaved={(m) => {
            updateUser({ examName: m.examName });
            setSettings(false);
            load();
          }}
        />
      )}
    </div>
  );
}
