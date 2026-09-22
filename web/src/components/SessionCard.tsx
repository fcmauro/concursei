import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { formatMinutes } from "../lib/date";

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
  note: string | null;
}

export interface SessionPatch {
  minutes: number;
  questions: number;
  correct: number;
  note: string;
  subjectId: string;
  topicId: string | null;
}

export interface SubjectOption {
  id: string;
  name: string;
  color: string;
  topics: { id: string; name: string }[];
}

export const TYPE_LABEL: Record<string, string> = {
  ESTUDO: "Estudo",
  SIMULADO: "Simulado",
  REVISAO_24H: "Revisão 24h",
  REVISAO_7D: "Revisão 7 dias",
  REVISAO_15D: "Revisão 15 dias",
  REVISAO_30D: "Revisão 30 dias",
};

export default function SessionCard({ session, onOpen }: { session: SessionRow; onOpen: (s: SessionRow) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: session.id });

  const color = session.subject_color || "#94a3b8";
  const isDone = session.status === "DONE";
  const isPostponed = session.status === "POSTPONED";
  const style = {
    transform: CSS.Translate.toString(transform),
    borderLeftColor: color,
    opacity: isDragging ? 0.45 : isPostponed ? 0.6 : 1,
    zIndex: isDragging ? 5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={`session-card ${isDone ? "status-done" : ""}`}>
      <button type="button" className="card-main" onClick={() => onOpen(session)} title="Clique para registrar tempo, questões e concluir">
        <span className="type-pill" style={{ color, background: `${color}22` }}>
          {TYPE_LABEL[session.type] || session.type}
        </span>
        <span className="card-subject">{session.subject_name}</span>
        {session.topic_name && <span className="card-topic">{session.topic_name}</span>}
        <span className="card-meta">
          {isDone ? (
            <>
              ✔ {formatMinutes(session.minutes)}
              {session.questions > 0 && ` · ${session.correct}/${session.questions}`}
            </>
          ) : (
            <>
              ⏱ {formatMinutes(session.minutes)}
              {isPostponed && ` · era ${new Date(session.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`}
            </>
          )}
        </span>
      </button>
      <button className="drag-handle" aria-label="Arrastar para outro dia" title="Arraste para outro dia" {...listeners} {...attributes}>
        ⠿
      </button>
    </div>
  );
}
