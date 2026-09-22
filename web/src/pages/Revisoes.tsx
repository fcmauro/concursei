import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import SessionModal from "../components/SessionModal";
import { TYPE_LABEL } from "../components/SessionCard";
import type { SessionRow, SessionPatch } from "../components/SessionCard";
import { localISO, SHORT_DOW } from "../lib/date";

type Tab = "programadas" | "atrasadas" | "concluidas" | "ignoradas";

function dayLabel(date: string, today: string) {
  const d = new Date(date + "T00:00:00");
  const diff = Math.round((d.getTime() - new Date(today + "T00:00:00").getTime()) / 86400000);
  const base = `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · ${SHORT_DOW[d.getDay()]}`;
  if (diff === 0) return `Hoje · ${base}`;
  if (diff === 1) return `Amanhã · ${base}`;
  if (diff === -1) return `Ontem · ${base}`;
  return base;
}

export default function Revisoes() {
  const [all, setAll] = useState<SessionRow[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("programadas");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shownDays, setShownDays] = useState(7);
  const today = localISO(new Date());

  const load = useCallback(async () => {
    const [reviews, subs] = await Promise.all([api.getReviews(), api.getSubjects()]);
    setAll(reviews);
    setSubjects(subs);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("concursei:sessions", load);
    return () => window.removeEventListener("concursei:sessions", load);
  }, [load]);

  const groups: Record<Tab, SessionRow[]> = {
    programadas: all.filter((s) => s.status === "TODO" && s.date >= today),
    atrasadas: all.filter((s) => s.status === "TODO" && s.date < today),
    concluidas: all.filter((s) => s.status === "DONE").reverse(),
    ignoradas: all.filter((s) => s.status === "POSTPONED"),
  };
  const list = groups[tab];
  const selected = all.find((s) => s.id === selectedId) || null;

  async function update(id: string, patch: Record<string, unknown>) {
    await api.patchSession(id, patch);
    setSelectedId(null);
    await load();
    window.dispatchEvent(new Event("concursei:sessions"));
  }

  const byDate = new Map<string, SessionRow[]>();
  for (const s of list) byDate.set(s.date, [...(byDate.get(s.date) || []), s]);
  const allDays = [...byDate.entries()];
  const visibleDays = allDays.slice(0, shownDays);

  const tabs: { key: Tab; label: string }[] = [
    { key: "programadas", label: "Programadas" },
    { key: "atrasadas", label: "Atrasadas" },
    { key: "concluidas", label: "Concluídas" },
    { key: "ignoradas", label: "Ignoradas" },
  ];

  if (loading) return <p className="loading">Carregando...</p>;

  return (
    <div className="revisoes-page">
      <div>
        <h2>Revisões</h2>
        <p className="subtitle">
          Geradas automaticamente (24h, 7, 15 e 30 dias) quando você conclui um assunto. Clique numa revisão para registrar tempo e questões.
        </p>
      </div>

      <div className="rev-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? "active" : ""} onClick={() => {
              setTab(t.key);
              setShownDays(7);
            }}>
            {t.label}
            {groups[t.key].length > 0 && <span className={`rev-count ${t.key === "atrasadas" ? "warn" : ""}`}>{groups[t.key].length}</span>}
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <p className="loading" style={{ padding: "50px 0" }}>
          {tab === "atrasadas" ? "Nenhuma revisão atrasada. Bom trabalho!" : "Nada por aqui ainda."}
        </p>
      )}

      {visibleDays.map(([date, items]) => (
        <section key={date} className="rev-day">
          <h3>{dayLabel(date, today)}</h3>
          {items.map((s) => (
            <button key={s.id} className="rev-row" style={{ borderLeftColor: s.subject_color }} onClick={() => setSelectedId(s.id)}>
              <span className="rev-badge">{TYPE_LABEL[s.type].replace("Revisão ", "")}</span>
              <span className="rev-main">
                <b>{s.subject_name}</b>
                {s.topic_name && <small>{s.topic_name}</small>}
              </span>
              {s.status === "DONE" && (
                <span className="rev-result">
                  {s.minutes} min{s.questions > 0 ? ` · ${s.correct}/${s.questions}` : ""}
                </span>
              )}
            </button>
          ))}
        </section>
      ))}

      {allDays.length > visibleDays.length && (
        <button className="ghost-btn more-btn" onClick={() => setShownDays((n) => n + 7)}>
          Mostrar mais dias ({allDays.length - visibleDays.length} restantes)
        </button>
      )}

      {selected && (
        <SessionModal
          session={selected}
          subjects={subjects}
          onClose={() => setSelectedId(null)}
          onDone={(id: string, d: SessionPatch) => update(id, { status: "DONE", ...d })}
          onSave={(id: string, d: SessionPatch) => update(id, { ...d })}
          onPostpone={(id: string) => update(id, { status: "POSTPONED" })}
          onReopen={(id: string) => update(id, { status: "TODO" })}
          onMove={(id: string, date: string) => update(id, { date, status: "TODO" })}
          onDelete={async (id: string) => {
            if (!window.confirm("Remover esta revisão?")) return;
            try {
              await api.deleteSession(id);
            } catch (e: any) {
              window.alert(`Não foi possível remover: ${e.message}`);
              return;
            }
            setSelectedId(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
