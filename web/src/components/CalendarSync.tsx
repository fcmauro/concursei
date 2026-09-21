import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

const fmtWhen = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "nunca";

export default function CalendarSync() {
  const [cfg, setCfg] = useState<any | null>(null);
  const [appleId, setAppleId] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [calendarName, setCalendarName] = useState("Concursei");
  const [autoSync, setAutoSync] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  function apply(c: any) {
    setCfg(c);
    if (c.configured) {
      setAppleId(c.appleId);
      setCalendarName(c.calendarName);
      setAutoSync(c.autoSync);
    }
  }

  async function load() {
    apply(await api.getCalendar());
  }

  useEffect(() => {
    load().then(() => poll());
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function poll() {
    if (timer.current) window.clearTimeout(timer.current);
    api
      .getCalendar()
      .then((c) => {
        setCfg(c);
        if (c.job?.running) timer.current = window.setTimeout(poll, 1500);
      })
      .catch(() => {});
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const r = await api.saveCalendar({ appleId, appPassword, calendarName, autoSync });
      apply(r);
      setAppPassword("");
      setMessage(r.calendarCreated ? `Conectado. Criei o calendário "${r.calendarName}" na sua conta.` : `Conectado. Calendário "${r.calendarName}" encontrado.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sync(full: boolean) {
    setError(null);
    setMessage(null);
    try {
      await api.syncCalendar(full);
      poll();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function wipe() {
    if (!window.confirm(`Apagar do calendário "${calendarName}" todos os eventos criados pelo Concursei?\n\nSeus dados no app não mudam, e eventos que não são do Concursei ficam intactos. Depois você pode clicar em "Sincronizar agora" para recriá-los.`)) return;
    setError(null);
    setMessage(null);
    try {
      await api.wipeCalendar();
      poll();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function remove() {
    const withEvents = window.confirm("Remover também os eventos que o Concursei criou no calendário?\n\nOK = remover eventos e credenciais\nCancelar = manter os eventos e só apagar as credenciais");
    if (!window.confirm("Desconectar o calendário do iPhone?")) return;
    setBusy(true);
    try {
      await api.deleteCalendar(withEvents);
      setAppPassword("");
      await load();
      setMessage("Calendário desconectado.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!cfg) return null;
  const job = cfg.job;
  const last = cfg.lastResult;

  return (
    <section className="panel">
      <h3>Sincronizar com o calendário do iPhone</h3>
      <p className="hint" style={{ margin: 0 }}>
        Cada sessão do Diário vira um evento no seu calendário do iCloud, encaixado nos horários da Rotina e fora dos seus compromissos. O evento mostra o que estudar (matéria, assunto e um roteiro). Ao gerar o plano ou mudar sessões, matérias, assuntos ou horários, o calendário é atualizado sozinho em alguns segundos.
      </p>

      <details className="how-to">
        <summary>Como conectar (3 passos)</summary>
        <ol>
          <li>
            Em <b>appleid.apple.com</b> → Entrar e segurança → <b>Senhas de app</b>, crie uma senha chamada "Concursei" (formato <code>xxxx-xxxx-xxxx-xxxx</code>). Não use a senha normal do Apple ID.
          </li>
          <li>Cole abaixo o Apple ID e essa senha de app e clique em <b>Conectar</b>. O calendário é criado se ainda não existir.</li>
          <li>No iPhone: Ajustes → Calendário → Contas → iCloud → ligue <b>Calendários</b>. O calendário aparece no app em poucos minutos.</li>
        </ol>
        <p className="hint">A senha fica guardada criptografada no servidor e nunca volta para o navegador. Não cole essa senha em nenhum outro lugar.</p>
      </details>

      <form className="cal-form" onSubmit={save}>
        <label>
          Apple ID
          <input type="email" value={appleId} onChange={(e) => setAppleId(e.target.value)} placeholder="voce@icloud.com" autoComplete="off" required />
        </label>
        <label>
          Senha de app
          <input
            type="password"
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            placeholder={cfg.configured ? "•••• guardada (deixe vazio para manter)" : "xxxx-xxxx-xxxx-xxxx"}
            autoComplete="new-password"
            required={!cfg.configured}
          />
        </label>
        <label>
          Nome do calendário
          <input value={calendarName} onChange={(e) => setCalendarName(e.target.value)} required />
        </label>
        <label className="inline-check">
          <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
          sincronizar automaticamente ao gerar ou alterar o plano
        </label>
        <div className="win-footer">
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Conectando..." : cfg.configured ? "Salvar e testar" : "Conectar"}
          </button>
          {cfg.configured && (
            <>
              <button type="button" className="ghost-btn" onClick={() => sync(false)} disabled={job?.running}>
                Sincronizar agora
              </button>
              <button type="button" className="ghost-btn" onClick={() => sync(true)} disabled={job?.running} title="Reenvia todos os eventos, mesmo os que não mudaram">
                Reenviar tudo
              </button>
              <span className="spacer" />
              <button type="button" className="danger-link ghost-btn" onClick={wipe} disabled={job?.running || busy}>
                Apagar todos os eventos
              </button>
              <button type="button" className="ghost-btn" onClick={remove} disabled={busy}>
                Desconectar
              </button>
            </>
          )}
        </div>
      </form>

      {error && <div className="error">{error}</div>}
      {message && <p className="ok-text">{message}</p>}

      {cfg.configured && (
        <p className="hint" style={{ margin: 0 }}>
          {job?.running ? (
            <>
              {job.kind === "wipe" ? "Apagando eventos" : "Sincronizando"}... {job.progress.done} de {job.progress.total}.
            </>
          ) : job?.error ? (
            <span style={{ color: "var(--danger)" }}>Última tentativa falhou: {job.error}</span>
          ) : (
            <>
              Última atualização: {fmtWhen(cfg.lastSyncAt)}
              {last ? ` — ${last.created} novos, ${last.updated} atualizados, ${last.deleted} removidos${last.failed ? `, ${last.failed} com falha` : ""}` : ""}
              {!job?.running && cfg.lastError && !job?.error ? ` (${cfg.lastError})` : ""}
            </>
          )}
        </p>
      )}
    </section>
  );
}
