import { Router } from "express";
import { db } from "../db";
import { AuthedRequest, requireAuth } from "../lib/auth";
import { isAdminEmail } from "../lib/admin";

const router = Router();
router.use(requireAuth);

router.use((req: AuthedRequest, res, next) => {
  const row = db.prepare("SELECT email FROM users WHERE id = ?").get(req.userId!) as { email: string } | undefined;
  if (!row || !isAdminEmail(row.email)) return res.status(403).json({ error: "Acesso restrito ao administrador" });
  next();
});

const toIso = (sqliteDate: string | null) => (sqliteDate ? sqliteDate.replace(" ", "T") + "Z" : null);

router.get("/users", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT
         u.id, u.email, u.name, u.exam_name, u.created_at,
         (SELECT COUNT(*) FROM subjects s WHERE s.user_id = u.id) AS subjects,
         (SELECT COUNT(*) FROM topics t JOIN subjects s2 ON s2.id = t.subject_id WHERE s2.user_id = u.id) AS topics,
         (SELECT COUNT(*) FROM sessions x WHERE x.user_id = u.id) AS sessions_total,
         (SELECT COUNT(*) FROM sessions x WHERE x.user_id = u.id AND x.status = 'DONE') AS sessions_done,
         (SELECT COALESCE(SUM(minutes),0) FROM sessions x WHERE x.user_id = u.id AND x.status = 'DONE') AS minutes_done,
         (SELECT MAX(date) FROM sessions x WHERE x.user_id = u.id AND x.status = 'DONE') AS last_studied
       FROM users u
       ORDER BY u.created_at DESC`
    )
    .all() as any[];

  res.json(
    rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      examName: r.exam_name,
      createdAt: toIso(r.created_at),
      subjects: r.subjects,
      topics: r.topics,
      sessionsTotal: r.sessions_total,
      sessionsDone: r.sessions_done,
      minutesDone: r.minutes_done,
      lastStudied: r.last_studied,
    }))
  );
});

export default router;
