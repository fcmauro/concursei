import { useDroppable } from "@dnd-kit/core";
import SessionCard from "./SessionCard";
import type { SessionRow } from "./SessionCard";

export default function Backlog({ sessions, onOpen }: { sessions: SessionRow[]; onOpen: (s: SessionRow) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: "backlog" });
  return (
    <section ref={setNodeRef} className={`backlog ${isOver ? "drag-over" : ""}`}>
      <div className="backlog-head">
        <strong>Guardados para depois ({sessions.length})</strong>
        <span>Arraste um card até aqui para tirar do dia; arraste daqui para qualquer dia quando quiser retomar.</span>
      </div>
      {sessions.length > 0 && (
        <div className="backlog-cards">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} onOpen={onOpen} />
          ))}
        </div>
      )}
    </section>
  );
}
