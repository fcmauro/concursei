import { useDroppable } from "@dnd-kit/core";
import SessionCard from "./SessionCard";
import type { SessionRow } from "./SessionCard";

const DOW = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function DayColumn({
  date,
  sessions,
  onDone,
  onPostpone,
  onDelete,
  onAddClick,
}: {
  date: string;
  sessions: SessionRow[];
  onDone: (id: string, questions: number, correct: number) => void;
  onPostpone: (id: string) => void;
  onDelete: (id: string) => void;
  onAddClick: (date: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const d = new Date(date + "T00:00:00");
  const isToday = date === new Date().toISOString().slice(0, 10);
  const totalMin = sessions.reduce((acc, s) => acc + (s.status !== "POSTPONED" ? s.minutes : 0), 0);

  return (
    <div ref={setNodeRef} className={`day-column ${isOver ? "drag-over" : ""} ${isToday ? "today" : ""}`}>
      <div className="day-header">
        <div className="day-name">{DOW[d.getDay()]}</div>
        <div className="day-date">{d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>
        <div className="day-total">{(totalMin / 60).toFixed(1)}h</div>
      </div>
      <div className="day-cards">
        {sessions.map((s) => (
          <SessionCard key={s.id} session={s} onDone={onDone} onPostpone={onPostpone} onDelete={onDelete} />
        ))}
      </div>
      <button className="add-btn" onClick={() => onAddClick(date)}>
        + adicionar
      </button>
    </div>
  );
}
