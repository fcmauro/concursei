import { Router } from "express";
import crypto from "crypto";
import { db } from "../db";
import { AuthedRequest, requireAuth } from "../lib/auth";

const router = Router();
router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const int = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : 0);

router.get("/", (req: AuthedRequest, res) => {
  res.json(db.prepare("SELECT * FROM simulados WHERE user_id = ? ORDER BY date DESC, created_at DESC").all(req.userId!));
});

router.post("/", (req: AuthedRequest, res) => {
  const { date, title, kind, durationMin, total, correct, blank } = req.body || {};
  if (typeof date !== "string" || !DATE_RE.test(date)) return res.status(400).json({ error: "date inválida" });
  if (typeof title !== "string" || !title.trim()) return res.status(400).json({ error: "title é obrigatório" });
  const t = int(total);
  const c = int(correct);
  const b = int(blank);
  if (t === 0) return res.status(400).json({ error: "Informe o total de questões" });
  if (c + b > t) return res.status(400).json({ error: "Acertos + em branco não podem passar do total" });
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO simulados (id, user_id, date, title, kind, duration_min, total, correct, blank, wrong) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, req.userId!, date, title.trim().slice(0, 120), kind === "CERTO_ERRADO" ? "CERTO_ERRADO" : "MULTIPLA", int(durationMin), t, c, b, t - c - b);
  res.status(201).json(db.prepare("SELECT * FROM simulados WHERE id = ?").get(id));
});

router.delete("/:id", (req: AuthedRequest, res) => {
  const r = db.prepare("DELETE FROM simulados WHERE id = ? AND user_id = ?").run(req.params.id, req.userId!);
  if (!r.changes) return res.status(404).json({ error: "Simulado não encontrado" });
  res.status(204).end();
});

export default router;
