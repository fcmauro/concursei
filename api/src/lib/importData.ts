import crypto from "crypto";
import { db } from "../db";
import { DEFAULT_SUBJECTS } from "./seedContent";

export interface ImportSession {
  date: string;
  subject: string;
  type: string;
  topic?: string | null;
  minutes?: number | null;
  questions?: number;
  correct?: number;
  status?: string;
  note?: string | null;
}

export interface ImportData {
  subjects?: Record<string, string[]>;
  weights?: Record<string, number>;
  done?: string[]; // "MATÉRIA|assunto" marcados como concluídos
  sessions?: ImportSession[];
}

export interface ImportStats {
  subjectsCreated: number;
  topicsCreated: number;
  topicsMarkedDone: number;
  sessionsCreated: number;
  sessionsSkipped: number;
  reviewsLinked: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TYPE: Record<string, { type: string; minutes: number }> = {
  ESTUDO: { type: "ESTUDO", minutes: 120 },
  SIMULADO: { type: "SIMULADO", minutes: 120 },
  "REVISÃO 24H": { type: "REVISAO_24H", minutes: 20 },
  "REVISÃO 7 DIAS": { type: "REVISAO_7D", minutes: 20 },
  "REVISÃO 15 DIAS": { type: "REVISAO_15D", minutes: 15 },
  "REVISÃO 30 DIAS": { type: "REVISAO_30D", minutes: 15 },
  REVISAO_24H: { type: "REVISAO_24H", minutes: 20 },
  REVISAO_7D: { type: "REVISAO_7D", minutes: 20 },
  REVISAO_15D: { type: "REVISAO_15D", minutes: 15 },
  REVISAO_30D: { type: "REVISAO_30D", minutes: 15 },
};
const OFFSET: Record<string, number> = { REVISAO_24H: 1, REVISAO_7D: 7, REVISAO_15D: 15, REVISAO_30D: 30 };
const STATUS: Record<string, string> = { "A FAZER": "TODO", TODO: "TODO", FEITO: "DONE", CONCLUÍDO: "DONE", CONCLUIDO: "DONE", DONE: "DONE", ADIADO: "POSTPONED", POSTPONED: "POSTPONED" };

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown, fallback: number | null = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
};

class Rollback extends Error {}

const isRealDate = (s: string) => {
  if (!DATE_RE.test(s)) return false;
  const t = Date.parse(s + "T12:00:00Z");
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s;
};
const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function validateImport(data: ImportData) {
  if (!isPlainObject(data)) return "Conteúdo inválido";
  const { subjects, weights, done, sessions } = data as Record<string, unknown>;

  if (subjects !== undefined) {
    if (!isPlainObject(subjects)) return "subjects deve ser um objeto { matéria: [assuntos] }";
    if (Object.keys(subjects).length > 100) return "Muitas matérias (máx. 100)";
    let topics = 0;
    for (const [name, list] of Object.entries(subjects)) {
      if (!clean(name)) return "Há matéria sem nome";
      if (!Array.isArray(list) || list.some((t) => typeof t !== "string")) return `Os assuntos de "${name}" devem ser uma lista de textos`;
      topics += list.length;
    }
    if (topics > 4000) return "Muitos assuntos (máx. 4000)";
  }
  if (weights !== undefined) {
    if (!isPlainObject(weights)) return "weights deve ser um objeto { matéria: peso }";
    for (const [name, w] of Object.entries(weights)) if (typeof w !== "number" || !Number.isFinite(w)) return `Peso inválido para "${name}"`;
  }
  if (done !== undefined && (!Array.isArray(done) || done.some((k) => typeof k !== "string" || !k.includes("|")))) {
    return "done deve ser uma lista de textos no formato MATÉRIA|assunto";
  }
  if (sessions !== undefined) {
    if (!Array.isArray(sessions)) return "sessions deve ser uma lista";
    if (sessions.length > 5000) return "Muitas sessões (máx. 5000)";
    for (const s of sessions as ImportSession[]) {
      if (!isPlainObject(s)) return "Sessão inválida";
      if (typeof s.date !== "string" || !isRealDate(s.date)) return `Data inválida em uma sessão: ${JSON.stringify(s.date)}`;
      if (typeof s.subject !== "string" || !clean(s.subject)) return "Há sessão sem matéria";
      if (typeof s.type !== "string" || !TYPE[clean(s.type).toUpperCase()]) return `Tipo de sessão desconhecido: "${clean(s.type)}"`;
    }
  }
  return null;
}

export function importData(userId: string, data: ImportData, dryRun = false): ImportStats {
  const stats: ImportStats = { subjectsCreated: 0, topicsCreated: 0, topicsMarkedDone: 0, sessionsCreated: 0, sessionsSkipped: 0, reviewsLinked: 0 };

  const run = db.transaction(() => {
    const subjectId = new Map<string, string>();
    const topicId = new Map<string, string>();
    let order = (db.prepare("SELECT COALESCE(MAX(sort_order), -1) m FROM subjects WHERE user_id = ?").get(userId) as any).m;

    const ensureSubject = (rawName: string) => {
      const name = clean(rawName);
      const cached = subjectId.get(name);
      if (cached) return cached;
      let s = db.prepare("SELECT id FROM subjects WHERE user_id = ? AND name = ?").get(userId, name) as { id: string } | undefined;
      const weight = data.weights?.[name];
      if (!s) {
        const known = DEFAULT_SUBJECTS.find((d) => d.name === name);
        s = { id: crypto.randomUUID() };
        db.prepare("INSERT INTO subjects (id, user_id, name, weight, color, sort_order, area) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
          s.id, userId, name, Math.min(10, Math.max(1, weight ?? 1)), known?.color || "#94a3b8", ++order, known?.area ?? null
        );
        stats.subjectsCreated++;
      } else if (weight !== undefined) {
        db.prepare("UPDATE subjects SET weight = ? WHERE id = ?").run(Math.min(10, Math.max(1, weight)), s.id);
      }
      subjectId.set(name, s.id);
      return s.id;
    };

    const ensureTopic = (rawSubject: string, rawTopic: string) => {
      const sid = ensureSubject(rawSubject);
      const name = clean(rawTopic, 300);
      const key = `${clean(rawSubject)}|${name}`;
      const cached = topicId.get(key);
      if (cached) return cached;
      let t = db.prepare("SELECT id FROM topics WHERE subject_id = ? AND name = ?").get(sid, name) as { id: string } | undefined;
      if (!t) {
        const max = (db.prepare("SELECT COALESCE(MAX(sort_order), -1) m FROM topics WHERE subject_id = ?").get(sid) as any).m;
        t = { id: crypto.randomUUID() };
        db.prepare("INSERT INTO topics (id, subject_id, name, sort_order) VALUES (?, ?, ?, ?)").run(t.id, sid, name, max + 1);
        stats.topicsCreated++;
      }
      topicId.set(key, t.id);
      return t.id;
    };

    for (const [name, topics] of Object.entries(data.subjects || {})) {
      ensureSubject(name);
      for (const t of topics || []) if (clean(t)) ensureTopic(name, t);
    }
    for (const [name, w] of Object.entries(data.weights || {})) if (!subjectId.has(clean(name)) && w) ensureSubject(name);

    for (const key of data.done || []) {
      const [sub, ...rest] = key.split("|");
      const tid = ensureTopic(sub, rest.join("|"));
      const r = db.prepare("UPDATE topics SET done = 1 WHERE id = ? AND done = 0").run(tid);
      stats.topicsMarkedDone += r.changes;
    }

    const studyByKey = new Map<string, string>();
    const rows = [...(data.sessions || [])].sort(
      (a, b) => (TYPE[clean(a.type).toUpperCase()]?.type === "ESTUDO" ? 0 : 1) - (TYPE[clean(b.type).toUpperCase()]?.type === "ESTUDO" ? 0 : 1) || a.date.localeCompare(b.date)
    );
    const exists = db.prepare(
      "SELECT id FROM sessions WHERE user_id = ? AND date = ? AND type = ? AND subject_id = ? AND COALESCE(topic_id, '') = ? AND (? = '' OR COALESCE(note, '') = ?)"
    );
    const insert = db.prepare(
      `INSERT INTO sessions (id, user_id, subject_id, topic_id, date, type, status, minutes, questions, correct, note, origin_session_id, auto)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    );

    for (const r of rows) {
      const map = TYPE[clean(r.type).toUpperCase()];
      const isSimulado = map.type === "SIMULADO";
      const sid = ensureSubject(r.subject);
      const tid = isSimulado || !clean(r.topic) ? null : ensureTopic(r.subject, r.topic as string);
      const noteText = clean(r.note, 2000) || (isSimulado ? clean(r.topic, 300) : "");
      const noteKey = tid ? "" : noteText;
      const dup = exists.get(userId, r.date, map.type, sid, tid || "", noteKey, noteKey) as { id: string } | undefined;
      if (dup) {
        if (map.type === "ESTUDO" && tid) studyByKey.set(`${sid}|${tid}|${r.date}`, dup.id);
        stats.sessionsSkipped++;
        continue;
      }
      const id = crypto.randomUUID();
      let origin: string | null = null;
      if (OFFSET[map.type] && tid) {
        origin = studyByKey.get(`${sid}|${tid}|${addDays(r.date, -OFFSET[map.type])}`) || null;
        if (origin) stats.reviewsLinked++;
      }
      const status = STATUS[clean(r.status).toUpperCase()] || "TODO";
      const questions = num(r.questions);
      const correct = Math.min(num(r.correct) ?? 0, questions ?? 0);
      const note = noteText || null;
      insert.run(id, userId, sid, tid, r.date, map.type, status, num(r.minutes, map.minutes), questions, correct, note, origin);
      if (map.type === "ESTUDO" && tid) studyByKey.set(`${sid}|${tid}|${r.date}`, id);
      stats.sessionsCreated++;
    }
    if (dryRun) throw new Rollback();
  });

  try {
    run();
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
  return stats;
}
