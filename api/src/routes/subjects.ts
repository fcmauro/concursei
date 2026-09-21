import { Router } from "express";
import crypto from "crypto";
import { db } from "../db";
import { AuthedRequest, requireAuth } from "../lib/auth";

const router = Router();
router.use(requireAuth);

// GET /subjects -> lista matérias + assuntos (edital) + status "matei no diário"
router.get("/", (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const subjects = db
    .prepare("SELECT * FROM subjects WHERE user_id = ? ORDER BY sort_order")
    .all(userId) as any[];

  const topicsStmt = db.prepare("SELECT * FROM topics WHERE subject_id = ? ORDER BY sort_order");
  const masteredStmt = db.prepare(
    `SELECT COUNT(*) as c FROM sessions WHERE topic_id = ? AND status = 'DONE'`
  );
  const exercStmt = db.prepare(
    `SELECT COALESCE(SUM(questions),0) as q, COALESCE(SUM(correct),0) as a
     FROM sessions WHERE topic_id = ?`
  );

  const result = subjects.map((s) => {
    const topics = (topicsStmt.all(s.id) as any[]).map((t) => {
      const mastered = (masteredStmt.get(t.id) as any).c > 0;
      const ex = exercStmt.get(t.id) as any;
      return {
        id: t.id,
        name: t.name,
        order: t.sort_order,
        mastered,
        questions: ex.q,
        correct: ex.a,
        desempenho: ex.q > 0 ? ex.a / ex.q : null,
      };
    });
    const masteredCount = topics.filter((t) => t.mastered).length;
    return {
      id: s.id,
      name: s.name,
      weight: s.weight,
      color: s.color,
      order: s.sort_order,
      topics,
      progress: topics.length ? masteredCount / topics.length : 0,
    };
  });

  res.json(result);
});

// POST /subjects -> cria matéria própria
router.post("/", (req: AuthedRequest, res) => {
  const { name, weight = 1, color = "#D9E1F2" } = req.body || {};
  if (!name) return res.status(400).json({ error: "name é obrigatório" });
  const id = crypto.randomUUID();
  const maxOrder = (
    db.prepare("SELECT COALESCE(MAX(sort_order),-1) as m FROM subjects WHERE user_id = ?").get(req.userId!) as any
  ).m;
  db.prepare(
    "INSERT INTO subjects (id, user_id, name, weight, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, req.userId!, name, weight, color, maxOrder + 1);
  res.status(201).json({ id, name, weight, color, order: maxOrder + 1, topics: [] });
});

// POST /subjects/:id/topics -> cria assunto dentro de uma matéria
router.post("/:id/topics", (req: AuthedRequest, res) => {
  const subject = db
    .prepare("SELECT id FROM subjects WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId!);
  if (!subject) return res.status(404).json({ error: "Matéria não encontrada" });
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "name é obrigatório" });
  const id = crypto.randomUUID();
  const maxOrder = (
    db.prepare("SELECT COALESCE(MAX(sort_order),-1) as m FROM topics WHERE subject_id = ?").get(req.params.id) as any
  ).m;
  db.prepare("INSERT INTO topics (id, subject_id, name, sort_order) VALUES (?, ?, ?, ?)").run(
    id,
    req.params.id,
    name,
    maxOrder + 1
  );
  res.status(201).json({ id, name, order: maxOrder + 1, mastered: false, questions: 0, correct: 0 });
});

export default router;
