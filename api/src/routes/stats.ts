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
  const totalHoursWeek = Number(req.query.totalHoursWeek || 18);
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
          `SELECT COALESCE(SUM(minutes),0) as m FROM sessions WHERE subject_id = ? AND type IN ('ESTUDO','SIMULADO')`
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

export default router;
