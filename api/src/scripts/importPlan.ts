import crypto from "crypto";
import fs from "fs";
import { db } from "../db";
import { DEFAULT_SUBJECTS } from "../lib/seedContent";

// uso: node dist/scripts/importPlan.js <email> <arquivo.json>
// JSON: { subjects: { "MATÉRIA": ["assunto", ...] }, weights: { "MATÉRIA": 1 }, sessions: [{ date, subject, type, topic, minutes, questions, correct, status }] }
const [email, file] = process.argv.slice(2);
if (!email || !file) {
  console.error("uso: node dist/scripts/importPlan.js <email> <arquivo.json>");
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, "utf-8"));
const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string } | undefined;
if (!user) {
  console.error(`Usuário ${email} não encontrado`);
  process.exit(1);
}

const TYPE: Record<string, { type: string; minutes: number }> = {
  ESTUDO: { type: "ESTUDO", minutes: 120 },
  SIMULADO: { type: "SIMULADO", minutes: 120 },
  "REVISÃO 24H": { type: "REVISAO_24H", minutes: 20 },
  "REVISÃO 7 DIAS": { type: "REVISAO_7D", minutes: 20 },
  "REVISÃO 15 DIAS": { type: "REVISAO_15D", minutes: 15 },
  "REVISÃO 30 DIAS": { type: "REVISAO_30D", minutes: 15 },
};
const OFFSET: Record<string, number> = { REVISAO_24H: 1, REVISAO_7D: 7, REVISAO_15D: 15, REVISAO_30D: 30 };
const STATUS: Record<string, string> = { "A FAZER": "TODO", FEITO: "DONE", CONCLUÍDO: "DONE", ADIADO: "POSTPONED" };

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const stats = { subjectsCreated: 0, topicsCreated: 0, sessionsCreated: 0, sessionsSkipped: 0, linked: 0 };

db.transaction(() => {
  const subjectId = new Map<string, string>();
  const topicId = new Map<string, string>();
  let order = (db.prepare("SELECT COALESCE(MAX(sort_order), -1) m FROM subjects WHERE user_id = ?").get(user.id) as any).m;

  for (const [name, topics] of Object.entries<string[]>(data.subjects || {})) {
    let s = db.prepare("SELECT id FROM subjects WHERE user_id = ? AND name = ?").get(user.id, name) as { id: string } | undefined;
    const weight = data.weights?.[name] ?? 1;
    if (!s) {
      const color = DEFAULT_SUBJECTS.find((d) => d.name === name)?.color || "#94a3b8";
      s = { id: crypto.randomUUID() };
      db.prepare("INSERT INTO subjects (id, user_id, name, weight, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)").run(s.id, user.id, name, weight, color, ++order);
      stats.subjectsCreated++;
    } else {
      db.prepare("UPDATE subjects SET weight = ? WHERE id = ?").run(weight, s.id);
    }
    subjectId.set(name, s.id);
    let torder = (db.prepare("SELECT COALESCE(MAX(sort_order), -1) m FROM topics WHERE subject_id = ?").get(s.id) as any).m;
    for (const t of topics) {
      let row = db.prepare("SELECT id FROM topics WHERE subject_id = ? AND name = ?").get(s.id, t) as { id: string } | undefined;
      if (!row) {
        row = { id: crypto.randomUUID() };
        db.prepare("INSERT INTO topics (id, subject_id, name, sort_order) VALUES (?, ?, ?, ?)").run(row.id, s.id, t, ++torder);
        stats.topicsCreated++;
      }
      topicId.set(`${name}|${t}`, row.id);
    }
  }

  const studyByKey = new Map<string, string>(); // subject|topic|date -> id
  const rows = [...data.sessions].sort((a: any, b: any) => (TYPE[a.type]?.type === "ESTUDO" ? 0 : 1) - (TYPE[b.type]?.type === "ESTUDO" ? 0 : 1) || a.date.localeCompare(b.date));

  const exists = db.prepare(
    "SELECT id FROM sessions WHERE user_id = ? AND date = ? AND type = ? AND subject_id = ? AND COALESCE(topic_id, '') = ?"
  );
  const insert = db.prepare(
    `INSERT INTO sessions (id, user_id, subject_id, topic_id, date, type, status, minutes, questions, correct, note, origin_session_id, auto)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
  );

  for (const r of rows) {
    const map = TYPE[r.type];
    const sid = subjectId.get(r.subject);
    if (!map || !sid) {
      stats.sessionsSkipped++;
      continue;
    }
    const isSimulado = map.type === "SIMULADO";
    const tid = isSimulado ? null : topicId.get(`${r.subject}|${r.topic}`) || null;
    const dup = exists.get(user.id, r.date, map.type, sid, tid || "") as { id: string } | undefined;
    if (dup) {
      if (map.type === "ESTUDO") studyByKey.set(`${sid}|${tid}|${r.date}`, dup.id);
      stats.sessionsSkipped++;
      continue;
    }
    const id = crypto.randomUUID();
    let origin: string | null = null;
    if (OFFSET[map.type] && tid) {
      origin = studyByKey.get(`${sid}|${tid}|${addDays(r.date, -OFFSET[map.type])}`) || null;
      if (origin) stats.linked++;
    }
    insert.run(id, user.id, sid, tid, r.date, map.type, STATUS[r.status] || "TODO", r.minutes ?? map.minutes, r.questions || 0, r.correct || 0, isSimulado ? r.topic : null, origin);
    if (map.type === "ESTUDO") studyByKey.set(`${sid}|${tid}|${r.date}`, id);
    stats.sessionsCreated++;
  }
})();

console.log(`Importado para ${email}:`, stats);
