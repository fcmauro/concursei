import { Router } from "express";
import { db } from "../db";
import { AuthedRequest, requireAuth } from "../lib/auth";

const router = Router();
router.use(requireAuth);

// GET /stats/weekly?from=YYYY-MM-DD&weeks=16
router.get("/weekly", (req: AuthedRequest, res) => {
  const from = (req.query.from as string) || new Date().toISOString().slice(0, 10);
  const weeks = Number(req.query.weeks || 16);

  const subjects = db
    .prepare("SELECT id, name, color FROM subjects WHERE user_id = ? ORDER BY sort_order")
    .all(req.userId!) as any[];

  const start = new Date(from);
  const result = subjects.map((s) => {
    const weekly: any[] = [];
    for (let w = 0; w < weeks; w++) {
      const wkStart = new Date(start);
      wkStart.setDate(wkStart.getDate() + w * 7);
      const wkEnd = new Date(wkStart);
      wkEnd.setDate(wkEnd.getDate() + 6);
      const wkStartStr = wkStart.toISOString().slice(0, 10);
      const wkEndStr = wkEnd.toISOString().slice(0, 10);
      const row = db
        .prepare(
          `SELECT COALESCE(SUM(questions),0) as q, COALESCE(SUM(correct),0) as a
           FROM sessions WHERE subject_id = ? AND date >= ? AND date <= ?`
        )
        .get(s.id, wkStartStr, wkEndStr) as any;
      weekly.push({
        weekStart: wkStartStr,
        questions: row.q,
        correct: row.a,
        desempenho: row.q > 0 ? row.a / row.q : null,
      });
    }
    return { subjectId: s.id, name: s.name, color: s.color, weekly };
  });

  res.json(result);
});

// GET /stats/hours -> peso -> horas previstas x horas no diário, igual aba "Dica de horas"
router.get("/hours", (req: AuthedRequest, res) => {
  const goal = db.prepare("SELECT goal_hours_week FROM users WHERE id = ?").get(req.userId!) as any;
  const totalHoursWeek = Number(req.query.totalHoursWeek || goal?.goal_hours_week || 18);
  const subjects = db
    .prepare("SELECT id, name, color, weight FROM subjects WHERE user_id = ? ORDER BY sort_order")
    .all(req.userId!) as any[];
  const totalWeight = subjects.reduce((acc, s) => acc + s.weight, 0) || 1;

  const result = subjects.map((s) => {
    const pct = s.weight / totalWeight;
    const hoursWeek = pct * totalHoursWeek;
    const minutesLogged = (
      db
        .prepare(
          `SELECT COALESCE(SUM(minutes),0) as m FROM sessions WHERE subject_id = ? AND status = 'DONE'`
        )
        .get(s.id) as any
    ).m;
    return {
      subjectId: s.id,
      name: s.name,
      color: s.color,
      weight: s.weight,
      percent: pct,
      hoursPerWeek: hoursWeek,
      hoursLogged: minutesLogged / 60,
    };
  });

  res.json(result);
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function shiftDay(iso: string, delta: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// GET /stats/dashboard?today=YYYY-MM-DD&from=YYYY-MM-DD&to=YYYY-MM-DD  (from/to = semana atual)
router.get("/dashboard", (req: AuthedRequest, res) => {
  const uid = req.userId!;
  const { today, from, to } = req.query as { today?: string; from?: string; to?: string };
  if (!today || !from || !to || ![today, from, to].every((d) => DATE_RE.test(d))) {
    return res.status(400).json({ error: "today, from e to (AAAA-MM-DD) são obrigatórios" });
  }

  const done = db
    .prepare("SELECT date, minutes, questions, correct, subject_id FROM sessions WHERE user_id = ? AND status = 'DONE'")
    .all(uid) as { date: string; minutes: number; questions: number; correct: number; subject_id: string }[];

  let totalMinutes = 0;
  let totalQuestions = 0;
  let totalCorrect = 0;
  const byDay = new Map<string, { minutes: number; questions: number; correct: number }>();
  const bySubject = new Map<string, { minutes: number; questions: number; correct: number }>();
  for (const s of done) {
    totalMinutes += s.minutes;
    totalQuestions += s.questions;
    totalCorrect += s.correct;
    const d = byDay.get(s.date) || { minutes: 0, questions: 0, correct: 0 };
    d.minutes += s.minutes;
    d.questions += s.questions;
    d.correct += s.correct;
    byDay.set(s.date, d);
    const b = bySubject.get(s.subject_id) || { minutes: 0, questions: 0, correct: 0 };
    b.minutes += s.minutes;
    b.questions += s.questions;
    b.correct += s.correct;
    bySubject.set(s.subject_id, b);
  }

  let streak = 0;
  let cursor = byDay.has(today) ? today : shiftDay(today, -1);
  while (byDay.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }

  const last28 = Array.from({ length: 28 }, (_, i) => {
    const date = shiftDay(today, i - 27);
    return { date, minutes: byDay.get(date)?.minutes || 0 };
  });

  const days: { date: string; minutes: number; questions: number; correct: number }[] = [];
  for (let d = from, n = 0; d <= to && n < 14; d = shiftDay(d, 1), n++) {
    const v = byDay.get(d) || { minutes: 0, questions: 0, correct: 0 };
    days.push({ date: d, ...v });
  }
  const week = {
    from,
    to,
    minutes: days.reduce((a, d) => a + d.minutes, 0),
    questions: days.reduce((a, d) => a + d.questions, 0),
    correct: days.reduce((a, d) => a + d.correct, 0),
    days,
  };

  const subjects = db
    .prepare("SELECT id, name, color FROM subjects WHERE user_id = ? ORDER BY sort_order")
    .all(uid) as { id: string; name: string; color: string }[];
  const perSubject = subjects.map((s) => {
    const v = bySubject.get(s.id) || { minutes: 0, questions: 0, correct: 0 };
    return { subjectId: s.id, name: s.name, color: s.color, ...v };
  });

  const topicsTotal = (
    db.prepare("SELECT COUNT(*) c FROM topics t JOIN subjects s ON s.id = t.subject_id WHERE s.user_id = ?").get(uid) as any
  ).c;
  const topicsMastered = (
    db
      .prepare(
        `SELECT COUNT(*) c FROM topics t JOIN subjects s ON s.id = t.subject_id
         WHERE s.user_id = ? AND (t.done = 1 OR EXISTS (SELECT 1 FROM sessions x WHERE x.topic_id = t.id AND x.status = 'DONE'))`
      )
      .get(uid) as any
  ).c;

  const reviewCount = (cmp: string) =>
    (
      db
        .prepare(`SELECT COUNT(*) c FROM sessions WHERE user_id = ? AND type LIKE 'REVISAO_%' AND status = 'TODO' AND date ${cmp} ?`)
        .get(uid, today) as any
    ).c;

  const user = db
    .prepare("SELECT exam_name, exam_date, prep_date, goal_hours_week, goal_questions_week FROM users WHERE id = ?")
    .get(uid) as any;

  res.json({
    totalMinutes,
    totalQuestions,
    totalCorrect,
    topics: { total: topicsTotal, mastered: topicsMastered },
    streak,
    last28,
    week,
    perSubject,
    reviews: { due: reviewCount("="), overdue: reviewCount("<") },
    goals: { hoursWeek: user.goal_hours_week, questionsWeek: user.goal_questions_week },
    examName: user.exam_name,
    examDate: user.exam_date,
    prepDate: user.prep_date,
  });
});

export default router;
