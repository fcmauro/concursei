import { Router } from "express";
import crypto from "crypto";
import { db } from "../db";
import { AuthedRequest, requireAuth } from "../lib/auth";

const router = Router();
router.use(requireAuth);

const REASONS = ["DESATENCAO", "DESCONHECIMENTO", "ESQUECIMENTO"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const optDate = (v: unknown) => (typeof v === "string" && DATE_RE.test(v) ? v : null);

const SELECT =
  "SELECT e.*, s.name as subject_name, s.color as subject_color, t.name as topic_name FROM errors e JOIN subjects s ON s.id = e.subject_id LEFT JOIN topics t ON t.id = e.topic_id";

router.get("/", (req: AuthedRequest, res) => {
  res.json(db.prepare(`${SELECT} WHERE e.user_id = ? ORDER BY e.created_at DESC`).all(req.userId!));
});

router.post("/", (req: AuthedRequest, res) => {
  const { subjectId, topicId, source, studiedAt, repeatAt, reason, correctReasoning } = req.body || {};
  if (!REASONS.includes(reason)) return res.status(400).json({ error: "reason inválido" });
  const subject = db.prepare("SELECT id FROM subjects WHERE id = ? AND user_id = ?").get(subjectId, req.userId!);
  if (!subject) return res.status(404).json({ error: "Matéria não encontrada" });
  if (topicId && !db.prepare("SELECT id FROM topics WHERE id = ? AND subject_id = ?").get(topicId, subjectId)) {
    return res.status(404).json({ error: "Assunto não encontrado nessa matéria" });
  }
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO errors (id, user_id, subject_id, topic_id, source, studied_at, repeat_at, reason, correct_reasoning) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    req.userId!,
    subjectId,
    topicId || null,
    typeof source === "string" ? source.trim().slice(0, 160) || null : null,
    optDate(studiedAt),
    optDate(repeatAt),
    reason,
    typeof correctReasoning === "string" ? correctReasoning.trim().slice(0, 2000) || null : null
  );
  res.status(201).json(db.prepare(`${SELECT} WHERE e.id = ?`).get(id));
});

router.patch("/:id", (req: AuthedRequest, res) => {
  const existing = db.prepare("SELECT id FROM errors WHERE id = ? AND user_id = ?").get(req.params.id, req.userId!);
  if (!existing) return res.status(404).json({ error: "Erro não encontrado" });
  if (req.body?.reviewed !== undefined) {
    db.prepare("UPDATE errors SET reviewed = ? WHERE id = ?").run(req.body.reviewed ? 1 : 0, req.params.id);
  }
  res.json(db.prepare(`${SELECT} WHERE e.id = ?`).get(req.params.id));
});

router.delete("/:id", (req: AuthedRequest, res) => {
  const r = db.prepare("DELETE FROM errors WHERE id = ? AND user_id = ?").run(req.params.id, req.userId!);
  if (!r.changes) return res.status(404).json({ error: "Erro não encontrado" });
  res.status(204).end();
});

export default router;
