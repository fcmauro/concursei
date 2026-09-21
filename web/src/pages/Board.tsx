import { useEffect, useState, useCallback } from "react";
import { DndContext } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { api } from "../api/client";
import DayColumn from "../components/DayColumn";
import AddSessionModal from "../components/AddSessionModal";
import type { SessionRow } from "../components/SessionCard";

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

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
  const [subjects, setSubjects] = useState<any[]>([]);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return toISO(d);
  });

  const load = useCallback(async () => {
    setLoading(true);
    const from = days[0];
    const to = days[6];
    const [s, subj] = await Promise.all([api.getSessions(from, to), api.getSubjects()]);
    setSessions(s);
    setSubjects(subj);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDone(id: string, questions: number, correct: number) {
    const updated = await api.patchSession(id, { status: "DONE", questions, correct });
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
    load(); // recarrega para trazer as revisões geradas
  }

  async function handlePostpone(id: string) {
    const updated = await api.patchSession(id, { status: "POSTPONED" });
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
  }

  async function handleDelete(id: string) {
    await api.deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleCreate(subjectId: string, topicId: string | undefined, type: string) {
    if (!modalDate) return;
    const created = await api.createSession({ subjectId, topicId, date: modalDate, type });
    setSessions((prev) => [...prev, created]);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const sessionId = String(active.id);
    const newDate = String(over.id);
    const session = sessions.find((s) => s.id === sessionId);
    if (!session || session.date === newDate) return;

    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, date: newDate } : s)));
    await api.patchSession(sessionId, { date: newDate, status: session.status === "POSTPONED" ? "TODO" : session.status });
  }

  return (
    <div className="board-page">
      <div className="board-toolbar">
        <button
          onClick={() => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() - 7);
            setWeekStart(d);
          }}
        >
          ◀ semana anterior
        </button>
        <strong>
          {new Date(days[0] + "T00:00:00").toLocaleDateString("pt-BR")} —{" "}
          {new Date(days[6] + "T00:00:00").toLocaleDateString("pt-BR")}
        </strong>
        <button
          onClick={() => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + 7);
            setWeekStart(d);
          }}
        >
          próxima semana ▶
        </button>
        <button onClick={() => setWeekStart(startOfWeek(new Date()))}>Hoje</button>
      </div>

      {loading ? (
        <p className="loading">Carregando...</p>
      ) : (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="board-grid">
            {days.map((date) => (
              <DayColumn
                key={date}
                date={date}
                sessions={sessions.filter((s) => s.date === date)}
                onDone={handleDone}
                onPostpone={handlePostpone}
                onDelete={handleDelete}
                onAddClick={setModalDate}
              />
            ))}
          </div>
        </DndContext>
      )}

      {modalDate && (
        <AddSessionModal date={modalDate} subjects={subjects} onClose={() => setModalDate(null)} onCreate={handleCreate} />
      )}
    </div>
  );
}
