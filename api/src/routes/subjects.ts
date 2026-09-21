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
  const lastStmt = db.prepare(`SELECT MAX(date) as d FROM sessions WHERE topic_id = ? AND status = 'DONE'`);
  const exercStmt = db.prepare(
    `SELECT COALESCE(SUM(questions),0) as q, COALESCE(SUM(correct),0) as a
     FROM sessions WHERE topic_id = ?`
  );

  const result = subjects.map((s) => {
    const topics = (topicsStmt.all(s.id) as any[]).map((t) => {
      const bySession = (masteredStmt.get(t.id) as any).c > 0;
      const mastered = bySession || t.done === 1;
      const ex = exercStmt.get(t.id) as any;
      return {
        id: t.id,
        name: t.name,
        order: t.sort_order,
        mastered,
        manual: t.done === 1,
        bySession,
        lastStudied: (lastStmt.get(t.id) as any).d as string | null,
        questions: ex.q,
        correct: ex.a,
        errors: ex.q - ex.a,
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

const HEX = /^#[0-9a-fA-F]{6}$/;

// troca o item com o vizinho e regrava sort_order 0..n-1 (up = mais para cima)
function moveInOrder(table: "topics" | "subjects", ids: string[], id: string, dir: "up" | "down") {
  const i = ids.indexOf(id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  const upd = db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`);
  ids.forEach((x, k) => upd.run(k, x));
}

// PATCH /subjects/topics/:topicId -> renomear e/ou marcar como concluído manualmente
router.patch("/topics/:topicId", (req: AuthedRequest, res) => {
  const topic = db
    .prepare("SELECT t.id FROM topics t JOIN subjects s ON s.id = t.subject_id WHERE t.id = ? AND s.user_id = ?")
    .get(req.params.topicId, req.userId!);
  if (!topic) return res.status(404).json({ error: "Assunto não encontrado" });
  const { name, done, subjectId, move } = req.body || {};
  if (move !== undefined && move !== "up" && move !== "down") return res.status(400).json({ error: "move deve ser up ou down" });
  if (name !== undefined && (typeof name !== "string" || !name.trim())) return res.status(400).json({ error: "name inválido" });
  if (subjectId !== undefined) {
    if (typeof subjectId !== "string") return res.status(400).json({ error: "subjectId inválido" });
    if (!db.prepare("SELECT id FROM subjects WHERE id = ? AND user_id = ?").get(subjectId, req.userId!)) {
      return res.status(404).json({ error: "Matéria de destino não encontrada" });
    }
  }

  const topicId = String(req.params.topicId);
  db.transaction(() => {
    if (name !== undefined) db.prepare("UPDATE topics SET name = ? WHERE id = ?").run(name.trim(), topicId);
    if (subjectId !== undefined) {
      const max = (db.prepare("SELECT COALESCE(MAX(sort_order), -1) m FROM topics WHERE subject_id = ?").get(subjectId) as any).m;
      db.prepare("UPDATE topics SET subject_id = ?, sort_order = ? WHERE id = ?").run(subjectId, max + 1, topicId);
      db.prepare("UPDATE sessions SET subject_id = ? WHERE topic_id = ?").run(subjectId, topicId);
      db.prepare("UPDATE errors SET subject_id = ? WHERE topic_id = ?").run(subjectId, topicId);
    }
    if (done !== undefined) db.prepare("UPDATE topics SET done = ? WHERE id = ?").run(done ? 1 : 0, topicId);
    if (move !== undefined) {
      const row = db.prepare("SELECT subject_id FROM topics WHERE id = ?").get(topicId) as { subject_id: string };
      const ids = (db.prepare("SELECT id FROM topics WHERE subject_id = ? ORDER BY sort_order, created_at").all(row.subject_id) as { id: string }[]).map((r) => r.id);
      moveInOrder("topics", ids, topicId, move);
    }
  })();
  res.json({ ok: true });
});

router.delete("/topics/:topicId", (req: AuthedRequest, res) => {
  const topic = db
    .prepare("SELECT t.id FROM topics t JOIN subjects s ON s.id = t.subject_id WHERE t.id = ? AND s.user_id = ?")
    .get(req.params.topicId, req.userId!);
  if (!topic) return res.status(404).json({ error: "Assunto não encontrado" });
  db.transaction(() => {
    db.prepare("UPDATE sessions SET topic_id = NULL WHERE topic_id = ?").run(req.params.topicId);
    db.prepare("UPDATE errors SET topic_id = NULL WHERE topic_id = ?").run(req.params.topicId);
    db.prepare("DELETE FROM topics WHERE id = ?").run(req.params.topicId);
  })();
  res.status(204).end();
});

// PATCH /subjects/:id -> nome, peso, cor
router.patch("/:id", (req: AuthedRequest, res) => {
  const subject = db.prepare("SELECT id FROM subjects WHERE id = ? AND user_id = ?").get(req.params.id, req.userId!);
  if (!subject) return res.status(404).json({ error: "Matéria não encontrada" });
  const { name, weight, color, move } = req.body || {};
  if (move !== undefined && move !== "up" && move !== "down") return res.status(400).json({ error: "move deve ser up ou down" });
  if (name !== undefined && (typeof name !== "string" || !name.trim())) return res.status(400).json({ error: "name inválido" });
  if (weight !== undefined && (!Number.isFinite(Math.round(Number(weight))) || Math.round(Number(weight)) < 1 || Math.round(Number(weight)) > 10)) {
    return res.status(400).json({ error: "weight deve ser de 1 a 10" });
  }
  if (color !== undefined && (typeof color !== "string" || !HEX.test(color))) return res.status(400).json({ error: "color inválida" });
  if (move !== undefined) {
    const ids = (db.prepare("SELECT id FROM subjects WHERE user_id = ? ORDER BY sort_order, created_at").all(req.userId!) as { id: string }[]).map((r) => r.id);
    db.transaction(() => moveInOrder("subjects", ids, String(req.params.id), move))();
  }
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) return res.status(400).json({ error: "name inválido" });
    db.prepare("UPDATE subjects SET name = ? WHERE id = ?").run(name.trim(), req.params.id);
  }
  if (weight !== undefined) {
    const w = Math.round(Number(weight));
    if (!Number.isFinite(w) || w < 1 || w > 10) return res.status(400).json({ error: "weight deve ser de 1 a 10" });
    db.prepare("UPDATE subjects SET weight = ? WHERE id = ?").run(w, req.params.id);
  }
  if (color !== undefined) {
    if (typeof color !== "string" || !HEX.test(color)) return res.status(400).json({ error: "color inválida" });
    db.prepare("UPDATE subjects SET color = ? WHERE id = ?").run(color, req.params.id);
  }
  res.json({ ok: true });
});

// DELETE /subjects/:id -> apaga matéria com assuntos, sessões e erros ligados
router.delete("/:id", (req: AuthedRequest, res) => {
  const subject = db.prepare("SELECT id FROM subjects WHERE id = ? AND user_id = ?").get(req.params.id, req.userId!);
  if (!subject) return res.status(404).json({ error: "Matéria não encontrada" });
  db.transaction(() => {
    db.prepare("DELETE FROM errors WHERE subject_id = ?").run(req.params.id);
    db.prepare("DELETE FROM sessions WHERE subject_id = ?").run(req.params.id);
    db.prepare("DELETE FROM topics WHERE subject_id = ?").run(req.params.id);
    db.prepare("DELETE FROM subjects WHERE id = ?").run(req.params.id);
  })();
  res.status(204).end();
});

export default router;
