import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

export interface SessionRow {
  id: string;
  subject_id: string;
  subject_name: string;
  subject_color: string;
  topic_id: string | null;
  topic_name: string | null;
  date: string;
  type: string;
  status: string;
  minutes: number;
  questions: number;
  correct: number;
}

const TYPE_LABEL: Record<string, string> = {
  ESTUDO: "Estudo",
  SIMULADO: "Simulado",
  REVISAO_24H: "Revisão 24h",
  REVISAO_7D: "Revisão 7 dias",
  REVISAO_15D: "Revisão 15 dias",
  REVISAO_30D: "Revisão 30 dias",
};

export default function SessionCard({
  session,
  onDone,
  onPostpone,
  onDelete,
}: {
  session: SessionRow;
  onDone: (id: string, questions: number, correct: number) => void;
  onPostpone: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [questions, setQuestions] = useState(session.questions || 0);
  const [correct, setCorrect] = useState(session.correct || 0);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: session.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    borderLeft: `5px solid ${session.subject_color}`,
    opacity: isDragging ? 0.4 : 1,
  };

  const statusClass =
    session.status === "DONE" ? "status-done" : session.status === "POSTPONED" ? "status-postponed" : "status-todo";

  return (
    <div ref={setNodeRef} style={style} className={`session-card ${statusClass}`}>
      <div className="card-drag" {...listeners} {...attributes}>
        <div className="card-type">{TYPE_LABEL[session.type] || session.type}</div>
        <div className="card-subject">{session.subject_name}</div>
        {session.topic_name && <div className="card-topic">{session.topic_name}</div>}
      </div>

      {session.status === "DONE" && (
        <div className="card-result">
          ✔ {session.correct}/{session.questions} questões
        </div>
      )}

      <div className="card-actions">
        {session.status !== "DONE" && (
          <button onClick={() => setExpanded((v) => !v)} className="mini-btn done">
            Concluir
          </button>
        )}
        {session.status === "TODO" && (
          <button onClick={() => onPostpone(session.id)} className="mini-btn postpone">
            Adiar
          </button>
        )}
        <button onClick={() => onDelete(session.id)} className="mini-btn delete">
          ✕
        </button>
      </div>

      {expanded && (
        <div className="card-form">
          <label>
            Questões
            <input type="number" min={0} value={questions} onChange={(e) => setQuestions(Number(e.target.value))} />
          </label>
          <label>
            Acertos
            <input type="number" min={0} value={correct} onChange={(e) => setCorrect(Number(e.target.value))} />
          </label>
          <button
            className="mini-btn confirm"
            onClick={() => {
              onDone(session.id, questions, correct);
              setExpanded(false);
            }}
          >
            Salvar e concluir
          </button>
        </div>
      )}
    </div>
  );
}
