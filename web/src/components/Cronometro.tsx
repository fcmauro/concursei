import { useEffect, useState } from "react";
import { api } from "../api/client";
import { localISO } from "../lib/date";

const KEY = "concursei.timer";

interface TimerState {
  startedAt: number | null;
  accMs: number;
  sessionId: string;
  subjectId: string;
  topicId: string;
  type: string;
}

const EMPTY: TimerState = { startedAt: null, accMs: 0, sessionId: "", subjectId: "", topicId: "", type: "ESTUDO" };

function loadState(): TimerState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${ss}`;
}

export default function Cronometro() {
  const [st, setSt] = useState<TimerState>(loadState);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [subjects, setSubjects] = useState<any[]>([]);
  const [planned, setPlanned] = useState<any[]>([]);
  const [finishing, setFinishing] = useState(false);
  const [minutes, setMinutes] = useState(1);
  const [questions, setQuestions] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const running = st.startedAt !== null;
  const elapsed = st.accMs + (running ? now - (st.startedAt as number) : 0);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(st));
  }, [st]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!open) return;
    const t = localISO(new Date());
    Promise.all([api.getSubjects(), api.getSessions(t, t)])
      .then(([s, ts]) => {
        setSubjects(s);
        setPlanned(ts.filter((x: any) => x.status === "TODO"));
      })
      .catch(() => {});
  }, [open]);

  const subject = subjects.find((s) => s.id === st.subjectId);
  const canStart = Boolean(st.sessionId || st.subjectId);

  function patch(p: Partial<TimerState>) {
    setSt((prev) => ({ ...prev, ...p }));
  }

  function pickPlanned(id: string) {
    const s = planned.find((x) => x.id === id);
    patch(s ? { sessionId: id, subjectId: s.subject_id, topicId: s.topic_id || "", type: s.type } : { sessionId: "" });
  }

  function start() {
    setNow(Date.now());
    patch({ startedAt: Date.now() });
  }

  function pause() {
    patch({ accMs: elapsed, startedAt: null });
  }

  function reset() {
    if (elapsed > 0 && !window.confirm("Descartar o tempo cronometrado?")) return;
    setSt({ ...EMPTY, subjectId: st.subjectId, type: st.type });
    setFinishing(false);
  }

  function beginFinish() {
    if (running) patch({ accMs: elapsed, startedAt: null });
    setMinutes(Math.max(1, Math.round(elapsed / 60000)));
    setQuestions(0);
    setCorrect(0);
    setNote("");
    setError(null);
    setFinishing(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const data = {
        status: "DONE",
        minutes: Math.max(0, minutes),
        questions: Math.max(0, questions),
        correct: Math.min(Math.max(0, correct), Math.max(0, questions)),
        note,
      };
      let id = st.sessionId;
      if (!id) {
        const created = await api.createSession({
          subjectId: st.subjectId,
          topicId: st.topicId || undefined,
          date: localISO(new Date()),
          type: st.type,
          minutes: data.minutes,
        });
        id = created.id;
      }
      await api.patchSession(id, data);
      setSt({ ...EMPTY, subjectId: st.subjectId });
      setFinishing(false);
      setOpen(false);
      window.dispatchEvent(new Event("concursei:sessions"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button className={`timer-fab ${running ? "running" : ""}`} onClick={() => setOpen((v) => !v)} aria-label="Cronômetro de estudo">
        <span>⏱</span>
        {(running || elapsed > 0) && <b>{fmt(elapsed)}</b>}
      </button>

      {open && (
        <div className="timer-panel" role="dialog" aria-label="Cronômetro de estudo">
          <div className="timer-head">
            <strong>Cronômetro de estudo</strong>
            <button onClick={() => setOpen(false)} aria-label="Fechar">
              ✕
            </button>
          </div>

          {!finishing ? (
            <>
              <div className="timer-display">{fmt(elapsed)}</div>

              {planned.length > 0 && (
                <label>
                  Sessão planejada para hoje
                  <select value={st.sessionId} onChange={(e) => pickPlanned(e.target.value)} disabled={running}>
                    <option value="">Nova sessão (escolher matéria)</option>
                    {planned.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.subject_name}
                        {p.topic_name ? ` — ${p.topic_name}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {!st.sessionId && (
                <>
                  <label>
                    Matéria
                    <select value={st.subjectId} onChange={(e) => patch({ subjectId: e.target.value, topicId: "" })} disabled={running}>
                      <option value="">Selecione...</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Assunto
                    <select value={st.topicId} onChange={(e) => patch({ topicId: e.target.value })} disabled={running || !subject}>
                      <option value="">(sem assunto específico)</option>
                      {subject?.topics.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Tipo
                    <select value={st.type} onChange={(e) => patch({ type: e.target.value })} disabled={running}>
                      <option value="ESTUDO">Estudo</option>
                      <option value="SIMULADO">Simulado</option>
                    </select>
                  </label>
                </>
              )}

              <div className="timer-actions">
                {running ? <button onClick={pause}>Pausar</button> : <button className="primary" onClick={start} disabled={!canStart}>{elapsed > 0 ? "Retomar" : "Iniciar"}</button>}
                <button onClick={beginFinish} disabled={elapsed < 1000}>
                  Finalizar
                </button>
                <button className="danger-link" onClick={reset} disabled={elapsed === 0}>
                  Zerar
                </button>
              </div>
              {!canStart && <p className="hint">Escolha a matéria (ou uma sessão planejada) para iniciar.</p>}
            </>
          ) : (
            <>
              <p className="hint" style={{ margin: 0 }}>
                Ao concluir, o app programa as revisões (24h, 7, 15 e 30 dias) do assunto.
              </p>
              <label>
                Tempo estudado (min)
                <input type="number" min={0} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
              </label>
              <div className="card-form-row">
                <label>
                  Questões
                  <input type="number" min={0} value={questions} onChange={(e) => setQuestions(Number(e.target.value))} />
                </label>
                <label>
                  Acertos
                  <input type="number" min={0} max={questions} value={correct} onChange={(e) => setCorrect(Number(e.target.value))} />
                </label>
              </div>
              <label>
                Anotação
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
              {error && <div className="error">{error}</div>}
              <div className="timer-actions">
                <button onClick={() => setFinishing(false)}>Voltar</button>
                <button className="primary" onClick={save} disabled={saving}>
                  {saving ? "Salvando..." : "Registrar estudo"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
