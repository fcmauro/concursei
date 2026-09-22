import { useEffect, useState, useCallback } from "react";
import { DndContext } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { api } from "../api/client";
import DayColumn from "../components/DayColumn";
import Backlog from "../components/Backlog";
import AddSessionModal from "../components/AddSessionModal";
import SessionModal from "../components/SessionModal";
import type { SessionRow, SessionPatch } from "../components/SessionCard";
import { localISO } from "../lib/date";

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // segunda como início
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function Board() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [backlog, setBacklog] = useState<SessionRow[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [avail, setAvail] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selected = [...sessions, ...backlog].find((s) => s.id === selectedId) || null;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return localISO(d);
  });

  const load = useCallback(async () => {
    const [s, b, subj, av, ev] = await Promise.all([
      api.getSessions(days[0], days[6]),
      api.getBacklog(),
      api.getSubjects(),
      api.getAvailability(),
      api.getEvents(days[0], days[6]),
    ]);
    setAvail(av);
    setEvents(ev);
    setSessions(s.filter((x: SessionRow) => x.status !== "POSTPONED"));
    setBacklog(b);
    setSubjects(subj);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  useEffect(() => {
    load();
    window.addEventListener("concursei:sessions", load);
    return () => window.removeEventListener("concursei:sessions", load);
  }, [load]);

  function place(next: SessionRow) {
    const inWeek = next.date >= days[0] && next.date <= days[6];
    setSessions((prev) => [...prev.filter((s) => s.id !== next.id), ...(next.status !== "POSTPONED" && inWeek ? [next] : [])]);
    setBacklog((prev) => [...prev.filter((s) => s.id !== next.id), ...(next.status === "POSTPONED" ? [next] : [])]);
  }

  async function update(id: string, patch: Record<string, unknown>) {
    const current = [...sessions, ...backlog].find((s) => s.id === id);
    if (current) place({ ...current, ...patch } as SessionRow);
    const updated = await api.patchSession(id, patch);
    if (current) place({ ...current, ...updated });
    setSelectedId(null);
  }

  async function handleDone(id: string, data: SessionPatch) {
    await update(id, { status: "DONE", ...data });
    load(); // traz as revisões geradas
  }

  const handleSave = (id: string, data: SessionPatch) => update(id, { ...data });
  const handlePostpone = (id: string) => update(id, { status: "POSTPONED" });
  const handleReopen = (id: string) => update(id, { status: "TODO" });
  const handleMove = (id: string, date: string) => {
    const s = [...sessions, ...backlog].find((x) => x.id === id);
    return update(id, { date, ...(s?.status === "POSTPONED" ? { status: "TODO" } : {}) });
  };

  async function handleDelete(id: string) {
    if (!window.confirm("Remover esta sessão?")) return;
    try {
      await api.deleteSession(id);
    } catch (e: any) {
      window.alert(`Não foi possível remover: ${e.message}`);
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setBacklog((prev) => prev.filter((s) => s.id !== id));
    setSelectedId(null);
  }

  async function handleCreate(subjectId: string, topicId: string | undefined, type: string, minutes: number) {
    if (!modalDate) return;
    const created = await api.createSession({ subjectId, topicId, date: modalDate, type, minutes });
    setSessions((prev) => [...prev, created]);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const id = String(active.id);
    const target = String(over.id);
    const session = [...sessions, ...backlog].find((s) => s.id === id);
    if (!session) return;

    if (target === "backlog") {
      if (session.status !== "POSTPONED") update(id, { status: "POSTPONED" });
      return;
    }
    if (session.date === target && session.status !== "POSTPONED") return;
    update(id, { date: target, ...(session.status === "POSTPONED" ? { status: "TODO" } : {}) });
  }

  return (
    <div className="board-page">
      <div className="board-toolbar">
        <button onClick={() => setWeekStart((w) => new Date(w.getFullYear(), w.getMonth(), w.getDate() - 7))}>◀ semana anterior</button>
        <strong>
          {new Date(days[0] + "T00:00:00").toLocaleDateString("pt-BR")} — {new Date(days[6] + "T00:00:00").toLocaleDateString("pt-BR")}
        </strong>
        <button onClick={() => setWeekStart((w) => new Date(w.getFullYear(), w.getMonth(), w.getDate() + 7))}>próxima semana ▶</button>
        <button onClick={() => setWeekStart(startOfWeek(new Date()))}>Hoje</button>
      </div>

      {loading ? (
        <p className="loading">Carregando...</p>
      ) : (
        <DndContext onDragEnd={handleDragEnd}>
          <Backlog sessions={backlog} onOpen={(s) => setSelectedId(s.id)} />
          <div className="board-grid">
            {days.map((date) => (
              <DayColumn
                key={date}
                date={date}
                sessions={sessions.filter((s) => s.date === date)}
                windows={avail.filter((w) => w.weekday === new Date(date + "T00:00:00").getDay())}
                events={events.filter((e) => e.date === date)}
                onOpen={(s) => setSelectedId(s.id)}
                onAddClick={setModalDate}
              />
            ))}
          </div>
        </DndContext>
      )}

      {selected && (
        <SessionModal
          session={selected}
          subjects={subjects}
          onClose={() => setSelectedId(null)}
          onDone={handleDone}
          onSave={handleSave}
          onPostpone={handlePostpone}
          onReopen={handleReopen}
          onMove={handleMove}
          onDelete={handleDelete}
        />
      )}

      {modalDate && (
        <AddSessionModal date={modalDate} subjects={subjects} onClose={() => setModalDate(null)} onCreate={handleCreate} />
      )}
    </div>
  );
}
