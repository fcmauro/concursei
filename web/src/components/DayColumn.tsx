import { useDroppable } from "@dnd-kit/core";
import SessionCard from "./SessionCard";
import type { SessionRow } from "./SessionCard";
import { localISO, formatMinutes } from "../lib/date";
import { dayBudget } from "../lib/schedule";
import type { Win } from "../lib/schedule";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export interface DayEvent extends Win {
  id: string;
  title: string;
  category: string;
}

export default function DayColumn({
  date,
  sessions,
  windows,
  events,
  onOpen,
  onAddClick,
}: {
  date: string;
  sessions: SessionRow[];
  windows: Win[];
  events: DayEvent[];
  onOpen: (s: SessionRow) => void;
  onAddClick: (date: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const d = new Date(date + "T00:00:00");
  const isToday = date === localISO(new Date());
  const plannedMin = sessions.reduce((acc, s) => acc + (s.status !== "POSTPONED" ? s.minutes : 0), 0);
  const doneMin = sessions.reduce((acc, s) => acc + (s.status === "DONE" ? s.minutes : 0), 0);
  const pct = plannedMin > 0 ? Math.min(100, Math.round((doneMin / plannedMin) * 100)) : 0;
  const budget = dayBudget(windows, events, plannedMin);
  const hasWindow = windows.length > 0;

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
        {hasWindow ? (
          <div className={`day-free ${budget.free < 0 ? "over" : ""}`} title={windows.map((w) => `${w.start_time}–${w.end_time}`).join(" · ")}>
            {budget.free >= 0 ? `livre: ${formatMinutes(budget.free)}` : `passou ${formatMinutes(-budget.free)} da janela`}
          </div>
        ) : (
          <div className="day-free none">sem janela de estudo</div>
        )}
      </div>
      <div className="day-cards">
        {events.map((e) => (
          <div key={e.id} className="event-chip" title={e.category}>
            <b>
              {e.start_time}–{e.end_time}
            </b>
            <span>{e.title}</span>
          </div>
        ))}
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
