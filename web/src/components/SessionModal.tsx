import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SessionRow, SessionPatch } from "./SessionCard";
import { TYPE_LABEL } from "./SessionCard";
import { formatMinutes } from "../lib/date";

export default function SessionModal({
  session,
  onClose,
  onDone,
  onSave,
  onPostpone,
  onReopen,
  onMove,
  onDelete,
}: {
  session: SessionRow;
  onClose: () => void;
  onDone: (id: string, data: SessionPatch) => void;
  onSave: (id: string, data: SessionPatch) => void;
  onPostpone: (id: string) => void;
  onReopen: (id: string) => void;
  onMove: (id: string, date: string) => void;
  onDelete: (id: string) => void;
}) {
  const [minutes, setMinutes] = useState(session.minutes || 0);
  const [questions, setQuestions] = useState(session.questions || 0);
  const [correct, setCorrect] = useState(session.correct || 0);
  const [note, setNote] = useState(session.note || "");
  const [moveTo, setMoveTo] = useState(session.date);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const color = session.subject_color || "#94a3b8";
  const isDone = session.status === "DONE";
  const pct = questions > 0 ? Math.round((Math.min(correct, questions) / questions) * 100) : null;

  const payload = (): SessionPatch => ({
    minutes: Math.max(0, minutes),
    questions: Math.max(0, questions),
    correct: Math.min(Math.max(0, correct), Math.max(0, questions)),
    note,
  });

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal session-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sm-head" style={{ borderLeftColor: color }}>
          <span className="type-pill" style={{ color, background: `${color}22` }}>
            {TYPE_LABEL[session.type] || session.type}
          </span>
          <h3>{session.subject_name}</h3>
          {session.topic_name && <p>{session.topic_name}</p>}
          <small>
            {new Date(session.date + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            {isDone ? " · concluído" : session.status === "POSTPONED" ? " · adiado" : ""}
          </small>
        </div>

        <div className="sm-field">
          <label htmlFor="sm-min">Tempo estudado</label>
          <div className="sm-time">
            <input id="sm-min" type="number" min={0} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
            <span>min = {formatMinutes(minutes)}</span>
          </div>
          <div className="sm-chips">
            <button type="button" onClick={() => setMinutes((m) => m + 15)}>+15 min</button>
            <button type="button" onClick={() => setMinutes((m) => m + 30)}>+30 min</button>
            <button type="button" onClick={() => setMinutes((m) => m + 60)}>+1 h</button>
            <button type="button" onClick={() => setMinutes(0)}>zerar</button>
          </div>
        </div>

        <div className="sm-grid">
          <div className="sm-field">
            <label htmlFor="sm-q">Questões feitas</label>
            <input id="sm-q" type="number" min={0} value={questions} onChange={(e) => setQuestions(Number(e.target.value))} />
          </div>
          <div className="sm-field">
            <label htmlFor="sm-c">Acertos</label>
            <input id="sm-c" type="number" min={0} max={questions} value={correct} onChange={(e) => setCorrect(Number(e.target.value))} />
          </div>
          <div className="sm-pct" aria-live="polite">
            <strong>{pct === null ? "—" : `${pct}%`}</strong>
            <span>desempenho</span>
          </div>
        </div>

        <div className="sm-field">
          <label htmlFor="sm-n">Anotação</label>
          <textarea id="sm-n" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Dúvidas, pegadinhas, o que revisar..." />
        </div>

        <div className="sm-field">
          <label htmlFor="sm-d">Mover para o dia</label>
          <div className="sm-time">
            <input id="sm-d" type="date" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} style={{ width: 170 }} />
            <button type="button" className="sm-move" disabled={!moveTo || (moveTo === session.date && session.status !== "POSTPONED")} onClick={() => onMove(session.id, moveTo)}>
              Mover
            </button>
          </div>
        </div>

        <div className="sm-actions">
          <button className="danger-link" onClick={() => onDelete(session.id)}>
            Remover
          </button>
          <span className="spacer" />
          {session.status === "TODO" && <button onClick={() => onPostpone(session.id)}>Guardar para depois</button>}
          {isDone && <button onClick={() => onReopen(session.id)}>Reabrir</button>}
          {session.status === "POSTPONED" && <button onClick={() => onReopen(session.id)}>Voltar para o dia</button>}
          <button onClick={() => onSave(session.id, payload())}>Salvar</button>
          {!isDone && (
            <button className="primary" onClick={() => onDone(session.id, payload())}>
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
