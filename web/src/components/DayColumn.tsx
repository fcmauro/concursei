import { useDroppable } from "@dnd-kit/core";
import SessionCard from "./SessionCard";
import type { SessionRow } from "./SessionCard";
import { localISO, formatMinutes } from "../lib/date";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function DayColumn({
  date,
  sessions,
  onOpen,
  onAddClick,
}: {
  date: string;
  sessions: SessionRow[];
  onOpen: (s: SessionRow) => void;
  onAddClick: (date: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const d = new Date(date + "T00:00:00");
  const isToday = date === localISO(new Date());
  const plannedMin = sessions.reduce((acc, s) => acc + (s.status !== "POSTPONED" ? s.minutes : 0), 0);
  const doneMin = sessions.reduce((acc, s) => acc + (s.status === "DONE" ? s.minutes : 0), 0);
  const pct = plannedMin > 0 ? Math.min(100, Math.round((doneMin / plannedMin) * 100)) : 0;

  return (
    <div ref={setNodeRef} className={`day-column ${isOver ? "drag-over" : ""} ${isToday ? "today" : ""}`}>
      <div className="day-header">
        <div className="day-name">{DOW[d.getDay()]}</div>
        <div className="day-date">{d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>
        <div className="day-total">
          {plannedMin ? `${formatMinutes(doneMin)} de ${formatMinutes(plannedMin)}` : "sem estudo planejado"}
        </div>
        <div className="day-bar">
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="day-cards">
        {sessions.map((s) => (
          <SessionCard key={s.id} session={s} onOpen={onOpen} />
        ))}
      </div>
      <button className="add-btn" onClick={() => onAddClick(date)}>
        + adicionar
      </button>
    </div>
  );
}
