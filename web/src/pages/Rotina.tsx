import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatMinutes, localISO } from "../lib/date";
import { toMin, WEEKDAYS } from "../lib/schedule";

type Windows = Record<number, { start: string; end: string }[]>;

const CATEGORIES = ["Trabalho", "Faculdade", "Saúde", "Família", "Lazer", "Outro"];

export default function Rotina() {
  const { updateUser } = useAuth();
  const [windows, setWindows] = useState<Windows>({});
  const [events, setEvents] = useState<any[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Trabalho");
  const [repeat, setRepeat] = useState<"weekly" | "once">("weekly");
  const [weekday, setWeekday] = useState(1);
  const [date, setDate] = useState(localISO(new Date()));
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("12:00");
  const [evError, setEvError] = useState<string | null>(null);

  async function load() {
    const [av, ev] = await Promise.all([api.getAvailability(), api.getAllEvents()]);
    const w: Windows = {};
    for (const a of av) (w[a.weekday] ||= []).push({ start: a.start_time, end: a.end_time });
    setWindows(w);
    setEvents(ev);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const totalMin = Object.values(windows)
    .flat()
    .reduce((acc, w) => acc + Math.max(0, toMin(w.end) - toMin(w.start)), 0);

  function setDay(n: number, list: { start: string; end: string }[]) {
    setSaved(false);
    setWindows((prev) => ({ ...prev, [n]: list }));
  }

  function copyMondayToWeekdays() {
    const mon = windows[1] || [];
    setSaved(false);
    setWindows((prev) => ({ ...prev, 2: [...mon], 3: [...mon], 4: [...mon], 5: [...mon] }));
  }

  async function save() {
    setError(null);
    try {
      const flat = Object.entries(windows).flatMap(([n, list]) => list.map((w) => ({ weekday: Number(n), start: w.start, end: w.end })));
      await api.saveAvailability(flat);
      setSaved(true);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function useAsGoal() {
    const hours = Math.round(totalMin / 60);
    await api.updateMe({ goalHoursWeek: hours });
    updateUser({});
    setSaved(true);
    window.alert(`Meta semanal definida em ${hours}h. Ela aparece no Painel e na aba Horas.`);
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    setEvError(null);
    try {
      await api.createEvent({ title, category, start, end, ...(repeat === "weekly" ? { weekday } : { date }) });
      setTitle("");
      await load();
    } catch (err: any) {
      setEvError(err.message);
    }
  }

  async function removeEvent(id: string) {
    await api.deleteEvent(id);
    await load();
  }

  if (loading) return <p className="loading">Carregando...</p>;

  const today = localISO(new Date());
  const weekly = events.filter((e) => e.date === null);
  const once = events.filter((e) => e.date !== null && e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const dayName = (n: number) => WEEKDAYS.find((w) => w.n === n)?.label;

  return (
    <div className="rotina-page">
      <div>
        <h2>Rotina semanal</h2>
        <p className="subtitle">
          Defina em que horários você pode estudar e cadastre compromissos fora do estudo. O Diário mostra quanto tempo ainda cabe em cada dia.
        </p>
      </div>

      <section className="panel">
        <h3>Horários de estudo</h3>
        <div className="win-list">
          {WEEKDAYS.map(({ n, label }) => (
            <div key={n} className="win-row">
              <strong>{label}</strong>
              <div className="win-slots">
                {(windows[n] || []).length === 0 && <span className="hint">sem janela (dia livre de estudo)</span>}
                {(windows[n] || []).map((w, i) => (
                  <span key={i} className="win-slot">
                    <input
                      type="time"
                      value={w.start}
                      aria-label={`${label} início`}
                      onChange={(e) => setDay(n, (windows[n] || []).map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                    />
                    <span>até</span>
                    <input
                      type="time"
                      value={w.end}
                      aria-label={`${label} fim`}
                      onChange={(e) => setDay(n, (windows[n] || []).map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                    />
                    <button type="button" aria-label="Remover janela" onClick={() => setDay(n, (windows[n] || []).filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  </span>
                ))}
                <button type="button" className="link-btn" onClick={() => setDay(n, [...(windows[n] || []), { start: "19:00", end: "21:00" }])}>
                  + janela
                </button>
              </div>
            </div>
          ))}
        </div>
        {error && <div className="error">{error}</div>}
        <div className="win-footer">
          <span>
            Total: <b>{formatMinutes(totalMin)}</b> por semana
          </span>
          <button type="button" className="link-btn" onClick={copyMondayToWeekdays}>
            copiar segunda para terça–sexta
          </button>
          <span className="spacer" />
          <button type="button" className="ghost-btn" onClick={useAsGoal} disabled={totalMin === 0}>
            Usar como meta semanal
          </button>
          <button type="button" className="primary" onClick={save}>
            {saved ? "Salvo ✔" : "Salvar horários"}
          </button>
        </div>
      </section>

      <section className="panel">
        <h3>Compromissos fora do estudo</h3>
        <form className="event-form" onSubmit={addEvent}>
          <label className="grow">
            Compromisso
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Trabalho, Academia, Consulta" required />
          </label>
          <label>
            Categoria
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Repetição
            <select value={repeat} onChange={(e) => setRepeat(e.target.value as "weekly" | "once")}>
              <option value="weekly">Toda semana</option>
              <option value="once">Só uma vez</option>
            </select>
          </label>
          {repeat === "weekly" ? (
            <label>
              Dia
              <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                {WEEKDAYS.map((w) => (
                  <option key={w.n} value={w.n}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Data
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
          )}
          <label>
            Início
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
          </label>
          <label>
            Fim
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </label>
          <button className="primary" type="submit">
            Adicionar
          </button>
        </form>
        {evError && <div className="error">{evError}</div>}

        {weekly.length === 0 && once.length === 0 && <p className="hint">Nenhum compromisso cadastrado.</p>}
        {weekly.length > 0 && (
          <>
            <h4 className="list-title">Toda semana</h4>
            <ul className="event-list">
              {weekly.map((e) => (
                <li key={e.id}>
                  <b>{dayName(e.weekday)}</b>
                  <span>
                    {e.start_time}–{e.end_time}
                  </span>
                  <span className="grow">{e.title}</span>
                  <em>{e.category}</em>
                  <button onClick={() => removeEvent(e.id)} aria-label="Remover compromisso">
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {once.length > 0 && (
          <>
            <h4 className="list-title">Próximos (pontuais)</h4>
            <ul className="event-list">
              {once.map((e) => (
                <li key={e.id}>
                  <b>{new Date(e.date + "T00:00:00").toLocaleDateString("pt-BR")}</b>
                  <span>
                    {e.start_time}–{e.end_time}
                  </span>
                  <span className="grow">{e.title}</span>
                  <em>{e.category}</em>
                  <button onClick={() => removeEvent(e.id)} aria-label="Remover compromisso">
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
