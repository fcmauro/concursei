import { Router } from "express";
import crypto from "crypto";
import { db } from "../db";
import { AuthedRequest, requireAuth } from "../lib/auth";

const router = Router();
router.use(requireAuth);

const REVISION_PLAN: { days: number; type: string }[] = [
  { days: 1, type: "REVISAO_24H" },
  { days: 7, type: "REVISAO_7D" },
  { days: 15, type: "REVISAO_15D" },
  { days: 30, type: "REVISAO_30D" },
];

const SESSION_SELECT =
  "SELECT s.*, sub.name as subject_name, sub.color as subject_color, t.name as topic_name FROM sessions s JOIN subjects sub ON sub.id = s.subject_id LEFT JOIN topics t ON t.id = s.topic_id";

function getSessionRow(id: string) {
  return db.prepare(`${SESSION_SELECT} WHERE s.id = ?`).get(id);
}

const VALID_STATUS = ["TODO", "DONE", "POSTPONED"];

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function generateRevisions(session: any) {
  if (!session.topic_id) return;
  if (session.type !== "ESTUDO" && session.type !== "SIMULADO") return;

  const existsStmt = db.prepare(
    "SELECT id FROM sessions WHERE origin_session_id = ? AND type = ?"
  );
  const insert = db.prepare(
    `INSERT INTO sessions (id, user_id, subject_id, topic_id, date, type, status, minutes, questions, correct, origin_session_id)
     VALUES (?, ?, ?, ?, ?, ?, 'TODO', 0, 0, 0, ?)`
  );
  for (const plan of REVISION_PLAN) {
    const already = existsStmt.get(session.id, plan.type);
    if (already) continue;
    const date = addDays(session.date, plan.days);
    insert.run(
      crypto.randomUUID(),
      session.user_id,
      session.subject_id,
      session.topic_id,
      date,
      plan.type,
      session.id
    );
  }
}

// GET /sessions?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/", (req: AuthedRequest, res) => {
  const { from, to, status, kind } = req.query as { from?: string; to?: string; status?: string; kind?: string };
  let query = `${SESSION_SELECT} WHERE s.user_id = ?`;
  const params: any[] = [req.userId!];
  if (from) {
    query += " AND s.date >= ?";
    params.push(from);
  }
  if (to) {
    query += " AND s.date <= ?";
    params.push(to);
  }
  if (kind === "review") query += " AND s.type LIKE 'REVISAO_%'";
  if (status && VALID_STATUS.includes(status)) {
    query += " AND s.status = ?";
    params.push(status);
  }
  query += " ORDER BY s.date, s.created_at";
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// POST /sessions -> cria sessão de estudo (planejar assunto num dia)
router.post("/", (req: AuthedRequest, res) => {
  const { subjectId, topicId, date, type = "ESTUDO", minutes = 120, note } = req.body || {};
  if (!subjectId || !date) {
    return res.status(400).json({ error: "subjectId e date são obrigatórios" });
  }
  const subject = db
    .prepare("SELECT id FROM subjects WHERE id = ? AND user_id = ?")
    .get(subjectId, req.userId!);
  if (!subject) return res.status(404).json({ error: "Matéria não encontrada" });

  if (topicId) {
    const topic = db.prepare("SELECT id FROM topics WHERE id = ? AND subject_id = ?").get(topicId, subjectId);
    if (!topic) return res.status(404).json({ error: "Assunto não encontrado nessa matéria" });
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO sessions (id, user_id, subject_id, topic_id, date, type, status, minutes, note)
     VALUES (?, ?, ?, ?, ?, ?, 'TODO', ?, ?)`
  ).run(id, req.userId!, subjectId, topicId || null, date, type, minutes, note || null);

  res.status(201).json(getSessionRow(id));
});

// PATCH /sessions/:id -> mover de dia (date), mudar status, registrar questões/acertos
router.patch("/:id", (req: AuthedRequest, res) => {
  const existing = db
    .prepare("SELECT * FROM sessions WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId!) as any;
  if (!existing) return res.status(404).json({ error: "Sessão não encontrada" });

  const fields: string[] = [];
  const params: any[] = [];
  const { date, status, minutes, questions, correct, note } = req.body || {};

  if (date !== undefined) {
    fields.push("date = ?");
    params.push(date);
  }
  if (status !== undefined) {
    if (!VALID_STATUS.includes(status)) return res.status(400).json({ error: "status inválido" });
    fields.push("status = ?");
    params.push(status);
  }
  if (minutes !== undefined) {
    fields.push("minutes = ?");
    params.push(minutes);
  }
  if (questions !== undefined) {
    fields.push("questions = ?");
    params.push(questions);
  }
  if (correct !== undefined) {
    fields.push("correct = ?");
    params.push(correct);
  }
  if (note !== undefined) {
    fields.push("note = ?");
    params.push(note);
  }
  fields.push("updated_at = datetime('now')");

  if (fields.length) {
    params.push(req.params.id);
    db.prepare(`UPDATE sessions SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  }

  const updated = getSessionRow(String(req.params.id)) as any;

  // se acabou de virar DONE, gera a trilha de revisão automaticamente
  if (status === "DONE" && existing.status !== "DONE") {
    generateRevisions(updated);
  }

  res.json(updated);
});

// DELETE /sessions/:id
router.delete("/:id", (req: AuthedRequest, res) => {
  const existing = db
    .prepare("SELECT id FROM sessions WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId!);
  if (!existing) return res.status(404).json({ error: "Sessão não encontrada" });
  db.transaction(() => {
    db.prepare("UPDATE sessions SET origin_session_id = NULL WHERE origin_session_id = ?").run(req.params.id);
    db.prepare("DELETE FROM sessions WHERE id = ?").run(req.params.id);
  })();
  res.status(204).end();
});

export default router;
