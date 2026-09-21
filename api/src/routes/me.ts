import { Router } from "express";
import { db } from "../db";
import { AuthedRequest, requireAuth } from "../lib/auth";

const router = Router();
router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function readUser(id: string) {
  const u = db
    .prepare("SELECT id, email, name, exam_name, exam_date, prep_date, goal_hours_week, goal_questions_week FROM users WHERE id = ?")
    .get(id) as any;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    examName: u.exam_name,
    examDate: u.exam_date,
    prepDate: u.prep_date,
    goalHoursWeek: u.goal_hours_week,
    goalQuestionsWeek: u.goal_questions_week,
  };
}

router.get("/", (req: AuthedRequest, res) => {
  res.json(readUser(req.userId!));
});

router.patch("/", (req: AuthedRequest, res) => {
  const { examName, examDate, prepDate, goalHoursWeek, goalQuestionsWeek } = req.body || {};
  const fields: string[] = [];
  const params: any[] = [];

  if (examName !== undefined) {
    fields.push("exam_name = ?");
    params.push(String(examName).trim() || null);
  }
  if (examDate !== undefined) {
    if (examDate !== null && examDate !== "" && !DATE_RE.test(examDate)) {
      return res.status(400).json({ error: "examDate inválida (use AAAA-MM-DD)" });
    }
    fields.push("exam_date = ?");
    params.push(examDate || null);
  }
  if (prepDate !== undefined) {
    if (prepDate !== null && prepDate !== "" && !DATE_RE.test(prepDate)) {
      return res.status(400).json({ error: "prepDate inválida (use AAAA-MM-DD)" });
    }
    fields.push("prep_date = ?");
    params.push(prepDate || null);
  }
  if (goalHoursWeek !== undefined) {
    const n = Number(goalHoursWeek);
    if (!Number.isFinite(n) || n < 0 || n > 168) return res.status(400).json({ error: "goalHoursWeek inválida" });
    fields.push("goal_hours_week = ?");
    params.push(Math.round(n));
  }
  if (goalQuestionsWeek !== undefined) {
    const n = Number(goalQuestionsWeek);
    if (!Number.isFinite(n) || n < 0 || n > 100000) return res.status(400).json({ error: "goalQuestionsWeek inválida" });
    fields.push("goal_questions_week = ?");
    params.push(Math.round(n));
  }
  if (fields.length) {
    params.push(req.userId!);
    db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  }
  res.json(readUser(req.userId!));
});

export default router;
