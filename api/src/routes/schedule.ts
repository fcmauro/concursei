import { Router } from "express";
import crypto from "crypto";
import { db } from "../db";
import { AuthedRequest, requireAuth } from "../lib/auth";
import { queueAutoSync } from "../lib/calendarSync";

const router = Router();
router.use(requireAuth);

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validRange(start: unknown, end: unknown) {
  return typeof start === "string" && typeof end === "string" && TIME_RE.test(start) && TIME_RE.test(end) && start < end;
}

router.get("/availability", (req: AuthedRequest, res) => {
  const rows = db
    .prepare("SELECT id, weekday, start_time, end_time FROM availability WHERE user_id = ? ORDER BY weekday, start_time")
    .all(req.userId!);
  res.json(rows);
});

// substitui todas as janelas de uma vez
router.put("/availability", (req: AuthedRequest, res) => {
  const windows = req.body?.windows;
  if (!Array.isArray(windows) || windows.length > 60) return res.status(400).json({ error: "windows inválido" });
  for (const w of windows) {
    if (!Number.isInteger(w.weekday) || w.weekday < 0 || w.weekday > 6 || !validRange(w.start, w.end)) {
      return res.status(400).json({ error: "Janela inválida: use dia 0-6 e horários HH:MM com início antes do fim" });
    }
  }
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM availability WHERE user_id = ?").run(req.userId!);
    const ins = db.prepare("INSERT INTO availability (id, user_id, weekday, start_time, end_time) VALUES (?, ?, ?, ?, ?)");
    for (const w of windows) ins.run(crypto.randomUUID(), req.userId!, w.weekday, w.start, w.end);
  });
  tx();
  queueAutoSync(req.userId!);
  res.json({ ok: true, count: windows.length });
});

function weekdayOf(iso: string) {
  return new Date(iso + "T12:00:00Z").getUTCDay();
}

// sem from/to: lista bruta. Com from/to: expande os semanais em ocorrências datadas.
router.get("/events", (req: AuthedRequest, res) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const rows = db
    .prepare("SELECT id, title, category, date, weekday, start_time, end_time FROM events WHERE user_id = ? ORDER BY start_time")
    .all(req.userId!) as any[];
  if (!from || !to) return res.json(rows);
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) return res.status(400).json({ error: "from/to inválidos" });

  const out: any[] = [];
  const start = new Date(from + "T12:00:00Z");
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    if (iso > to) break;
    for (const e of rows) {
      if (e.date === iso || (e.date === null && e.weekday === d.getUTCDay())) out.push({ ...e, date: iso, recurring: e.date === null });
    }
  }
  res.json(out);
});

router.post("/events", (req: AuthedRequest, res) => {
  const { title, category, date, weekday, start, end } = req.body || {};
  if (typeof title !== "string" || !title.trim()) return res.status(400).json({ error: "title é obrigatório" });
  if (!validRange(start, end)) return res.status(400).json({ error: "Horários inválidos: início deve ser antes do fim (HH:MM)" });
  const hasDate = typeof date === "string" && DATE_RE.test(date);
  const hasWeekday = Number.isInteger(weekday) && weekday >= 0 && weekday <= 6;
  if (hasDate === hasWeekday) return res.status(400).json({ error: "Informe date (pontual) OU weekday (semanal)" });
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO events (id, user_id, title, category, date, weekday, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
    id,
    req.userId!,
    title.trim().slice(0, 120),
    (typeof category === "string" && category.trim()) || "Outro",
    hasDate ? date : null,
    hasWeekday ? weekday : null,
    start,
    end
  );
  queueAutoSync(req.userId!);
  res.status(201).json(db.prepare("SELECT id, title, category, date, weekday, start_time, end_time FROM events WHERE id = ?").get(id));
});

router.delete("/events/:id", (req: AuthedRequest, res) => {
  const r = db.prepare("DELETE FROM events WHERE id = ? AND user_id = ?").run(req.params.id, req.userId!);
  if (!r.changes) return res.status(404).json({ error: "Compromisso não encontrado" });
  queueAutoSync(req.userId!);
  res.status(204).end();
});

export default router;
