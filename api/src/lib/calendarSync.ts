import crypto from "crypto";
import { createDAVClient, createAccount } from "tsdav";
import { db } from "../db";
import { decrypt } from "./secretBox";
import { buildIcs } from "./ics";

const SERVER_URL = process.env.CALDAV_SERVER_URL || "https://caldav.icloud.com";

const TYPE_LABEL: Record<string, string> = {
  ESTUDO: "Estudo",
  SIMULADO: "Simulado",
  REVISAO_24H: "Revisão 24h",
  REVISAO_7D: "Revisão 7 dias",
  REVISAO_15D: "Revisão 15 dias",
  REVISAO_30D: "Revisão 30 dias",
};

export interface SyncStats {
  total: number;
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  failed: number;
}

export interface JobState {
  kind: "sync" | "wipe";
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  progress: { done: number; total: number };
  stats: SyncStats | null;
  error: string | null;
}

const jobs = new Map<string, JobState>();

export const getJob = (userId: string): JobState =>
  jobs.get(userId) || { kind: "sync", running: false, startedAt: null, finishedAt: null, progress: { done: 0, total: 0 }, stats: null, error: null };

const brDate = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

const ROTEIRO: Record<string, string[]> = {
  ESTUDO: ["1) Primeira leitura do assunto inteiro, sem marcar nada.", "2) Segunda leitura grifando o que vale revisar.", "3) Faça questões do assunto e anote os erros no Caderno de erros."],
  SIMULADO: ["1) Faça cronometrado, como na prova.", "2) Corrija e leve os erros para o Caderno de erros."],
  REVISAO: ["1) Revise só grifos, erros e lei seca (não releia tudo).", "2) Faça algumas questões do assunto para testar a memória."],
};

export function eventTitle(s: any, label: string) {
  const what = s.topic_name ? ` — ${s.topic_name}` : "";
  return `${s.status === "DONE" ? "✔ " : ""}${label}: ${s.subject_name}${what}`.slice(0, 140);
}

export function eventDescription(s: any, label: string) {
  const isReview = String(s.type).startsWith("REVISAO");
  const lines = [
    `O QUE ESTUDAR: ${s.topic_name || (s.type === "SIMULADO" ? "Simulado geral" : "(sem assunto definido)")}`,
    `Matéria: ${s.subject_name}`,
    `Tipo: ${label} · ${s.minutes || 0} min`,
  ];
  if (isReview && s.origin_date) lines.push(`Estudado pela primeira vez em ${brDate(s.origin_date)}`);
  const roteiro = ROTEIRO[isReview ? "REVISAO" : s.type] || [];
  if (roteiro.length) lines.push("", "ROTEIRO", ...roteiro);
  if (s.status === "DONE") lines.push("", `Concluído: ${s.minutes || 0} min${s.questions ? ` · ${s.correct}/${s.questions} questões` : ""}`);
  if (s.note) lines.push("", `Anotação: ${s.note}`);
  return lines.join("\n");
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const stamp = (date: string, minutes: number) => {
  const m = Math.min(1439, Math.max(0, minutes));
  return `${date.replace(/-/g, "")}T${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}00`;
};

interface Range {
  start_time: string;
  end_time: string;
}

// encaixa as sessões do dia nas janelas de estudo, pulando compromissos; se não couber, empilha depois da última
export function placeDay(sessions: { id: string; type: string; minutes: number }[], windows: Range[], events: Range[]) {
  const wins = [...windows].sort((a, b) => toMin(a.start_time) - toMin(b.start_time));
  let segs: [number, number][] = [];
  for (const w of wins) {
    let parts: [number, number][] = [[toMin(w.start_time), toMin(w.end_time)]];
    for (const e of events) {
      const es = toMin(e.start_time);
      const ee = toMin(e.end_time);
      parts = parts.flatMap(([a, b]): [number, number][] =>
        ee <= a || es >= b ? [[a, b]] : ([[a, Math.min(b, es)], [Math.max(a, ee), b]] as [number, number][]).filter(([x, y]) => y - x > 0)
      );
    }
    segs = segs.concat(parts);
  }
  segs.sort((a, b) => a[0] - b[0]);

  const ordered = [...sessions].sort((a, b) => Number(b.type.startsWith("REVISAO")) - Number(a.type.startsWith("REVISAO")));
  const out = new Map<string, [number, number]>();
  let i = 0;
  let pos = segs[0]?.[0] ?? 19 * 60;
  let tail = pos;
  for (const s of ordered) {
    const dur = Math.max(15, s.minutes || 0);
    while (i < segs.length && segs[i][1] - Math.max(pos, segs[i][0]) < dur) {
      i++;
      if (i < segs.length) pos = segs[i][0];
    }
    if (i < segs.length) {
      pos = Math.max(pos, segs[i][0]);
      out.set(s.id, [pos, pos + dur]);
      pos += dur;
      tail = Math.max(tail, pos);
    } else {
      out.set(s.id, [tail, tail + dur]);
      tail += dur;
    }
  }
  return out;
}

function loadSettings(userId: string) {
  const row = db.prepare("SELECT * FROM calendar_settings WHERE user_id = ?").get(userId) as any;
  if (!row) return null;
  return { ...row, password: decrypt(row.password_enc) as string };
}

export async function connect(appleId: string, password: string, calendarName: string, createIfMissing: boolean) {
  const headers = { Authorization: "Basic " + Buffer.from(`${appleId}:${password}`).toString("base64") };
  const client = await createDAVClient({
    serverUrl: SERVER_URL,
    credentials: { username: appleId, password },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
  const list = async () => (await client.fetchCalendars()).filter((c) => !c.components || c.components.includes("VEVENT"));
  let calendars = await list();
  const wanted = calendarName.trim().toLowerCase();
  const find = () => calendars.find((c) => String(c.displayName || "").trim().toLowerCase() === wanted);
  let calendar = find();
  let created = false;
  if (!calendar && createIfMissing) {
    const account = await createAccount({ account: { serverUrl: SERVER_URL, accountType: "caldav" }, headers });
    const home = account.homeUrl || calendars[0]?.url.replace(/[^/]+\/?$/, "");
    if (!home) throw new Error("Não encontrei onde criar o calendário");
    const res = await client.makeCalendar({
      url: `${home.endsWith("/") ? home : home + "/"}${crypto.randomUUID().toUpperCase()}/`,
      props: {
        "d:displayname": calendarName.trim(),
        "c:supported-calendar-component-set": { comp: { _attributes: { name: "VEVENT" } } },
      } as any,
    });
    if (res.some((r) => r.ok === false)) throw new Error("Não consegui criar o calendário");
    calendars = await list();
    calendar = find();
    created = Boolean(calendar);
  }
  return { calendar, created, calendars: calendars.map((c) => String(c.displayName || "")) };
}

const authHeader = (u: string, p: string) => "Basic " + Buffer.from(`${u}:${p}`).toString("base64");

async function put(url: string, ics: string, auth: string) {
  const r = await fetch(url, { method: "PUT", headers: { Authorization: auth, "Content-Type": "text/calendar; charset=utf-8" }, body: ics });
  if (![200, 201, 204].includes(r.status)) throw new Error(`PUT ${r.status}`);
}

async function del(url: string, auth: string) {
  const r = await fetch(url, { method: "DELETE", headers: { Authorization: auth } });
  if (![200, 204, 404].includes(r.status)) throw new Error(`DELETE ${r.status}`);
}

async function pool<T>(items: T[], size: number, fn: (x: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    })
  );
}

export function friendlyError(e: any) {
  const msg = String(e?.message || e);
  if (/401|unauthor|credential|authent/i.test(msg)) return "Apple ID ou senha de app inválidos.";
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(msg)) return "Não consegui falar com o servidor do calendário.";
  return msg.slice(0, 200);
}

async function run(userId: string, full: boolean, job: JobState) {
  const cfg = loadSettings(userId);
  if (!cfg) throw new Error("Calendário não configurado");
  const { calendar } = await connect(cfg.apple_id, cfg.password, cfg.calendar_name, true);
  if (!calendar) throw new Error(`Calendário "${cfg.calendar_name}" não encontrado`);
  const auth = authHeader(cfg.apple_id, cfg.password);
  const base = calendar.url.endsWith("/") ? calendar.url : calendar.url + "/";

  const from = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const sessions = db
    .prepare(
      `SELECT s.id, s.date, s.type, s.status, s.minutes, s.questions, s.correct, s.note, s.created_at, sub.name AS subject_name, t.name AS topic_name, o.date AS origin_date
       FROM sessions s JOIN subjects sub ON sub.id = s.subject_id LEFT JOIN topics t ON t.id = s.topic_id LEFT JOIN sessions o ON o.id = s.origin_session_id
       WHERE s.user_id = ? AND s.status IN ('TODO','DONE') AND s.date >= ? ORDER BY s.date, s.created_at`
    )
    .all(userId, from) as any[];
  const windows = db.prepare("SELECT weekday, start_time, end_time FROM availability WHERE user_id = ?").all(userId) as any[];
  const eventRows = db.prepare("SELECT date, weekday, start_time, end_time FROM events WHERE user_id = ?").all(userId) as any[];

  const byDate = new Map<string, any[]>();
  for (const s of sessions) byDate.set(s.date, [...(byDate.get(s.date) || []), s]);

  const existing = new Map<string, { uid: string; hash: string; seq: number }>();
  for (const r of db.prepare("SELECT session_id, uid, hash, seq FROM calendar_sync WHERE user_id = ?").all(userId) as any[]) existing.set(r.session_id, r);

  const stats: SyncStats = { total: sessions.length, created: 0, updated: 0, deleted: 0, unchanged: 0, failed: 0 };
  const puts: { id: string; uid: string; ics: string; hash: string; seq: number; isNew: boolean }[] = [];

  for (const [date, list] of byDate) {
    const wd = new Date(date + "T12:00:00Z").getUTCDay();
    const wins = windows.filter((w) => w.weekday === wd);
    const evs = eventRows.filter((e) => e.date === date || (e.date === null && e.weekday === wd));
    const times = placeDay(list, wins, evs);
    for (const s of list) {
      const [a, b] = times.get(s.id)!;
      const label = TYPE_LABEL[s.type] || s.type;
      const summary = eventTitle(s, label);
      const description = eventDescription(s, label);
      const uid = `${s.id}@concursei`;
      const alarm = s.status === "TODO" && (s.type === "ESTUDO" || s.type === "SIMULADO");
      const hash = crypto.createHash("sha1").update(JSON.stringify([summary, description, stamp(date, a), stamp(date, b), alarm])).digest("hex");
      const prev = existing.get(s.id);
      if (prev && prev.hash === hash && !full) {
        stats.unchanged++;
        continue;
      }
      const seq = prev ? prev.seq + 1 : 0;
      puts.push({
        id: s.id,
        uid,
        hash,
        seq,
        isNew: !prev,
        ics: buildIcs({ uid, summary, description, category: label, start: stamp(date, a), end: stamp(date, b), seq, alarm }),
      });
    }
  }

  const desired = new Set(sessions.map((s) => s.id));
  const keepOld = db.prepare("SELECT 1 FROM sessions WHERE id = ? AND status IN ('TODO','DONE') AND date < ?");
  const removals = [...existing.entries()].filter(([id]) => !desired.has(id) && !keepOld.get(id, from));

  job.progress = { done: 0, total: puts.length + removals.length };
  const upsert = db.prepare(
    "INSERT INTO calendar_sync (user_id, session_id, uid, hash, seq) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, session_id) DO UPDATE SET hash = excluded.hash, seq = excluded.seq"
  );

  await pool(puts, 4, async (p) => {
    try {
      await put(`${base}${encodeURIComponent(p.uid)}.ics`, p.ics, auth);
      upsert.run(userId, p.id, p.uid, p.hash, p.seq);
      p.isNew ? stats.created++ : stats.updated++;
    } catch (e) {
      stats.failed++;
    }
    job.progress.done++;
  });
  await pool(removals, 4, async ([id, r]) => {
    try {
      await del(`${base}${encodeURIComponent(r.uid)}.ics`, auth);
      db.prepare("DELETE FROM calendar_sync WHERE user_id = ? AND session_id = ?").run(userId, id);
      stats.deleted++;
    } catch {
      stats.failed++;
    }
    job.progress.done++;
  });
  return stats;
}

export function startSync(userId: string, full = false) {
  const current = jobs.get(userId);
  if (current?.running) return current;
  const job: JobState = { kind: "sync", running: true, startedAt: new Date().toISOString(), finishedAt: null, progress: { done: 0, total: 0 }, stats: null, error: null };
  jobs.set(userId, job);
  run(userId, full, job)
    .then((stats) => {
      job.stats = stats;
      db.prepare("UPDATE calendar_settings SET last_sync_at = ?, last_result = ?, last_error = ? WHERE user_id = ?").run(
        new Date().toISOString(),
        JSON.stringify(stats),
        stats.failed ? `${stats.failed} evento(s) falharam` : null,
        userId
      );
    })
    .catch((e) => {
      job.error = friendlyError(e);
      db.prepare("UPDATE calendar_settings SET last_error = ? WHERE user_id = ?").run(job.error, userId);
    })
    .finally(() => {
      job.running = false;
      job.finishedAt = new Date().toISOString();
    });
  return job;
}

const pending = new Map<string, ReturnType<typeof setTimeout>>();

// agrupa várias alterações seguidas (editar matéria, concluir sessão...) em uma única sincronização
export function queueAutoSync(userId: string, delayMs = 8000) {
  if (!db.prepare("SELECT 1 FROM calendar_settings WHERE user_id = ? AND auto_sync = 1").get(userId)) return;
  const old = pending.get(userId);
  if (old) clearTimeout(old);
  pending.set(
    userId,
    setTimeout(() => {
      pending.delete(userId);
      if (jobs.get(userId)?.running) return queueAutoSync(userId, 5000);
      startSync(userId, false);
    }, delayMs)
  );
}

export function triggerAutoSync(userId: string) {
  const row = db.prepare("SELECT auto_sync FROM calendar_settings WHERE user_id = ?").get(userId) as { auto_sync: number } | undefined;
  if (!row || !row.auto_sync) return false;
  startSync(userId, false);
  return true;
}

// apaga do calendário todos os eventos criados pelo Concursei (UID terminado em @concursei); os outros ficam intactos
export function startWipe(userId: string) {
  const current = jobs.get(userId);
  if (current?.running) return current;
  const job: JobState = { kind: "wipe", running: true, startedAt: new Date().toISOString(), finishedAt: null, progress: { done: 0, total: 0 }, stats: null, error: null };
  jobs.set(userId, job);
  const pendingTimer = pending.get(userId);
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pending.delete(userId);
  }
  (async () => {
    const cfg = loadSettings(userId);
    if (!cfg) throw new Error("Calendário não configurado");
    const client = await createDAVClient({
      serverUrl: SERVER_URL,
      credentials: { username: cfg.apple_id, password: cfg.password },
      authMethod: "Basic",
      defaultAccountType: "caldav",
    });
    const calendars = (await client.fetchCalendars()).filter((c) => !c.components || c.components.includes("VEVENT"));
    const calendar = calendars.find((c) => String(c.displayName || "").trim().toLowerCase() === String(cfg.calendar_name).trim().toLowerCase());
    if (!calendar) {
      db.prepare("DELETE FROM calendar_sync WHERE user_id = ?").run(userId);
      return { total: 0, created: 0, updated: 0, deleted: 0, unchanged: 0, failed: 0 } as SyncStats;
    }
    const auth = authHeader(cfg.apple_id, cfg.password);
    const objects = await client.fetchCalendarObjects({ calendar });
    const mine = objects.filter((o) => /^UID:.*@concursei\s*$/m.test(String(o.data || "")));
    job.progress = { done: 0, total: mine.length };
    const stats: SyncStats = { total: mine.length, created: 0, updated: 0, deleted: 0, unchanged: 0, failed: 0 };
    await pool(mine, 4, async (o) => {
      try {
        await del(o.url, auth);
        stats.deleted++;
      } catch {
        stats.failed++;
      }
      job.progress.done++;
    });
    if (!stats.failed) db.prepare("DELETE FROM calendar_sync WHERE user_id = ?").run(userId);
    return stats;
  })()
    .then((stats) => {
      job.stats = stats;
      db.prepare("UPDATE calendar_settings SET last_sync_at = ?, last_result = ?, last_error = ? WHERE user_id = ?").run(
        new Date().toISOString(),
        JSON.stringify(stats),
        stats.failed ? `${stats.failed} evento(s) não puderam ser apagados` : null,
        userId
      );
    })
    .catch((e) => {
      job.error = friendlyError(e);
      db.prepare("UPDATE calendar_settings SET last_error = ? WHERE user_id = ?").run(job.error, userId);
    })
    .finally(() => {
      job.running = false;
      job.finishedAt = new Date().toISOString();
    });
  return job;
}

export async function removeAllEvents(userId: string) {
  const cfg = loadSettings(userId);
  if (!cfg) return 0;
  const { calendar } = await connect(cfg.apple_id, cfg.password, cfg.calendar_name, false);
  if (!calendar) return 0;
  const auth = authHeader(cfg.apple_id, cfg.password);
  const base = calendar.url.endsWith("/") ? calendar.url : calendar.url + "/";
  const rows = db.prepare("SELECT uid FROM calendar_sync WHERE user_id = ?").all(userId) as { uid: string }[];
  let n = 0;
  await pool(rows, 4, async (r) => {
    try {
      await del(`${base}${encodeURIComponent(r.uid)}.ics`, auth);
      n++;
    } catch {
      /* segue */
    }
  });
  return n;
}
