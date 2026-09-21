import { Router } from "express";
import crypto from "crypto";
import { db } from "../db";
import { AuthedRequest, requireAuth } from "../lib/auth";
import { triggerAutoSync } from "../lib/calendarSync";

const router = Router();
router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SIM_SUBJECT = "SIMULADOS / REVISÃO GERAL";
const REVIEWS = [
  { days: 1, type: "REVISAO_24H", minutes: 20 },
  { days: 7, type: "REVISAO_7D", minutes: 20 },
  { days: 15, type: "REVISAO_15D", minutes: 15 },
  { days: 30, type: "REVISAO_30D", minutes: 15 },
];
const STUDY_BLOCK = 120;
const SIMULADO_MIN = 180;

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const overlap = (a1: number, a2: number, b1: number, b2: number) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const weekdayOf = (iso: string) => new Date(iso + "T12:00:00Z").getUTCDay();
const diffDays = (a: string, b: string) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);

interface PlanItem {
  id: string;
  date: string;
  type: string;
  subjectId: string | null;
  topicId: string | null;
  minutes: number;
  originId: string | null;
  note?: string;
}

// POST /plan  { today, until, from?, apply?, replace? }
router.post("/", (req: AuthedRequest, res) => {
  const uid = req.userId!;
  const { today, until, apply, replace } = req.body || {};
  if (typeof today !== "string" || !DATE_RE.test(today) || typeof until !== "string" || !DATE_RE.test(until)) {
    return res.status(400).json({ error: "today e until (AAAA-MM-DD) são obrigatórios" });
  }
  const from = typeof req.body.from === "string" && DATE_RE.test(req.body.from) ? req.body.from : today;
  const totalDays = diffDays(from, until) + 1;
  if (totalDays < 7) return res.status(400).json({ error: "A data final precisa ser pelo menos 7 dias à frente" });
  if (totalDays > 400) return res.status(400).json({ error: "Período máximo de 400 dias" });

  const windows = db.prepare("SELECT weekday, start_time, end_time FROM availability WHERE user_id = ?").all(uid) as any[];
  if (!windows.length) {
    return res.status(400).json({ error: "Defina seus horários de estudo (aba Rotina ou configuração rápida) antes de gerar o plano" });
  }
  const eventRows = db.prepare("SELECT date, weekday, start_time, end_time FROM events WHERE user_id = ?").all(uid) as any[];

  const existing = db
    .prepare("SELECT id, date, minutes, status, type, topic_id, origin_session_id, auto FROM sessions WHERE user_id = ? AND date >= ?")
    .all(uid, from) as any[];

  const autoTodo = existing.filter((s) => s.auto === 1 && s.status === "TODO");
  const autoIds = new Set(autoTodo.map((s) => s.id));
  const toDelete = replace ? autoTodo.filter((s) => s.origin_session_id === null || autoIds.has(s.origin_session_id)) : [];
  const deleteIds = new Set(toDelete.map((s) => s.id));
  const kept = existing.filter((s) => !deleteIds.has(s.id) && s.status !== "POSTPONED");

  const occupied = new Map<string, number>();
  for (const s of kept) occupied.set(s.date, (occupied.get(s.date) || 0) + s.minutes);
  const alreadyPlanned = new Set(kept.filter((s) => s.type === "ESTUDO" && s.status === "TODO" && s.topic_id).map((s) => s.topic_id));

  const subjects = db.prepare("SELECT id, name, color, weight, area FROM subjects WHERE user_id = ? AND weight > 0 ORDER BY sort_order").all(uid) as any[];
  const topicRows = db
    .prepare(
      `SELECT t.id, t.subject_id, t.name, t.done,
              EXISTS (SELECT 1 FROM sessions x WHERE x.topic_id = t.id AND x.status = 'DONE') as studied
       FROM topics t JOIN subjects s ON s.id = t.subject_id WHERE s.user_id = ? ORDER BY t.sort_order`
    )
    .all(uid) as any[];

  const topicName = new Map<string, string>(topicRows.map((t) => [t.id, t.name]));
  const subjectInfo = new Map<string, { name: string; color: string }>(subjects.map((s) => [s.id, { name: s.name, color: s.color }]));
  const queues = new Map<string, string[]>();
  let pendingTotal = 0;
  for (const s of subjects) {
    const ids = topicRows.filter((t) => t.subject_id === s.id && !t.done && !t.studied && !alreadyPlanned.has(t.id)).map((t) => t.id);
    if (ids.length) queues.set(s.id, ids);
    pendingTotal += ids.length;
  }
  const weightOf = new Map<string, number>(subjects.map((s) => [s.id, Math.max(1, s.weight)]));
  const orderOf = new Map<string, number>(subjects.map((s, i) => [s.id, i]));
  const areaOf = new Map<string, string>(subjects.map((s) => [s.id, (s.area || "").trim().toLowerCase() || `matéria:${s.id}`]));
  const totalOf = new Map<string, number>([...queues.entries()].map(([id, q]) => [id, q.length]));
  const picked = new Map<string, number>();
  let lastArea = "";
  let lastSubject = "";

  // Todas as matérias avançam no mesmo ritmo (fração dos assuntos já agendados; o peso adianta as mais importantes)
  // e, entre as mais atrasadas, prefere-se uma de outra área/matéria que a anterior para intercalar.
  const nextTopic = () => {
    const active = [...queues.entries()].filter(([, q]) => q.length > 0).map(([id]) => id);
    if (!active.length) return null;
    const score = (id: string) => (picked.get(id) || 0) / (totalOf.get(id) || 1) / Math.sqrt(weightOf.get(id)!);
    const ranked = active.sort((a, b) => score(a) - score(b) || orderOf.get(a)! - orderOf.get(b)!);
    const window = ranked.slice(0, 8);
    const best =
      window.find((id) => areaOf.get(id) !== lastArea && id !== lastSubject) ||
      window.find((id) => id !== lastSubject) ||
      ranked[0];
    picked.set(best, (picked.get(best) || 0) + 1);
    lastArea = areaOf.get(best)!;
    lastSubject = best;
    return { subjectId: best, topicId: queues.get(best)!.shift()! };
  };

  const days = Array.from({ length: totalDays }, (_, i) => {
    const date = addDays(from, i);
    const wd = weekdayOf(date);
    const ws = windows.filter((w) => w.weekday === wd);
    const evs = eventRows.filter((e) => e.date === date || (e.date === null && e.weekday === wd));
    const avail = ws.reduce((a, w) => a + toMin(w.end_time) - toMin(w.start_time), 0);
    const blocked = ws.reduce((a, w) => a + evs.reduce((b, e) => b + overlap(toMin(w.start_time), toMin(w.end_time), toMin(e.start_time), toMin(e.end_time)), 0), 0);
    return { date, cap: Math.max(0, avail - blocked - (occupied.get(date) || 0)) };
  });

  const finalDays = Math.min(14, Math.floor(totalDays * 0.2));
  const studyLastIdx = totalDays - 1 - finalDays;

  const simDays = new Set<number>();
  const weeks = new Map<string, number[]>();
  days.forEach((d, i) => {
    const wd = weekdayOf(d.date);
    const monday = addDays(d.date, wd === 0 ? -6 : 1 - wd);
    weeks.set(monday, [...(weeks.get(monday) || []), i]);
  });
  [...weeks.values()].forEach((idxs, ordinal) => {
    const cands = idxs.filter((i) => days[i].cap >= 150);
    if (!cands.length) return;
    const pick = cands.reduce((a, b) => (days[b].cap >= days[a].cap ? b : a));
    if (pick > studyLastIdx || ordinal % 2 === 1) simDays.add(pick);
  });

  const items: PlanItem[] = [];
  const due: { date: string; type: string; minutes: number; subjectId: string; topicId: string; originId: string }[] = [];
  let leftover = 0;

  days.forEach((day, idx) => {
    let cap = day.cap;
    if (cap < 20) return;
    const inStudy = idx <= studyLastIdx;

    if (simDays.has(idx)) {
      const minutes = Math.min(cap, SIMULADO_MIN);
      items.push({ id: crypto.randomUUID(), date: day.date, type: "SIMULADO", subjectId: null, topicId: null, minutes, originId: null, note: "Simulado geral (plano automático)" });
      cap -= minutes;
    }

    let budget = inStudy ? Math.floor(cap * 0.4) : cap;
    due.sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < due.length && budget >= 15; ) {
      const r = due[i];
      if (r.date > day.date) break;
      if (r.minutes > budget) {
        i++;
        continue;
      }
      items.push({ id: crypto.randomUUID(), date: day.date, type: r.type, subjectId: r.subjectId, topicId: r.topicId, minutes: r.minutes, originId: r.originId });
      cap -= r.minutes;
      budget -= r.minutes;
      due.splice(i, 1);
    }

    if (inStudy && cap >= 30) {
      let n = Math.max(1, Math.round(cap / STUDY_BLOCK));
      let block = Math.floor(cap / n / 5) * 5;
      if (block < 30) {
        n = 1;
        block = Math.floor(cap / 5) * 5;
      }
      for (let i = 0; i < n; i++) {
        const pick = nextTopic();
        if (!pick) break;
        const id = crypto.randomUUID();
        items.push({ id, date: day.date, type: "ESTUDO", subjectId: pick.subjectId, topicId: pick.topicId, minutes: block, originId: null });
        cap -= block;
        for (const r of REVIEWS) {
          const dueDate = addDays(day.date, r.days);
          if (dueDate <= until) due.push({ date: dueDate, type: r.type, minutes: r.minutes, subjectId: pick.subjectId, topicId: pick.topicId, originId: id });
        }
      }
    }
    leftover += Math.max(0, cap);
  });

  const unplanned = [...queues.values()].reduce((a, q) => a + q.length, 0);
  const sum = (type: (t: string) => boolean) => items.filter((i) => type(i.type)).reduce((a, i) => a + i.minutes, 0);
  const perSubject = subjects
    .map((s) => {
      const mine = items.filter((i) => i.type === "ESTUDO" && i.subjectId === s.id);
      return { name: s.name, color: s.color, minutes: mine.reduce((a, i) => a + i.minutes, 0), topics: mine.length };
    })
    .filter((s) => s.topics > 0);

  const label = (i: PlanItem) => ({
    date: i.date,
    type: i.type,
    minutes: i.minutes,
    subject: i.subjectId ? subjectInfo.get(i.subjectId)?.name || "" : SIM_SUBJECT,
    color: i.subjectId ? subjectInfo.get(i.subjectId)?.color || "#94a3b8" : "#64748B",
    topic: i.topicId ? topicName.get(i.topicId) || null : null,
  });
  const sampleDates = [...new Set(items.map((i) => i.date))].slice(0, 14);
  const sample = sampleDates.map((date) => ({ date, items: items.filter((i) => i.date === date).map(label) }));

  const summary = {
    from,
    until,
    days: totalDays,
    studyDays: new Set(items.map((i) => i.date)).size,
    studyMinutes: sum((t) => t === "ESTUDO"),
    reviewMinutes: sum((t) => t.startsWith("REVISAO")),
    simuladoMinutes: sum((t) => t === "SIMULADO"),
    simulados: items.filter((i) => i.type === "SIMULADO").length,
    reviews: items.filter((i) => i.type.startsWith("REVISAO")).length,
    reviewsUnplaced: due.length,
    topicsPending: pendingTotal,
    topicsPlanned: pendingTotal - unplanned,
    topicsUnplanned: unplanned,
    leftoverMinutes: leftover,
    replacing: toDelete.length,
    perSubject,
  };

  if (!apply) return res.json({ applied: false, summary, sample });

  db.transaction(() => {
    const ordered = [...toDelete].sort((a, b) => (b.origin_session_id ? 1 : 0) - (a.origin_session_id ? 1 : 0));
    for (const s of ordered) db.prepare("DELETE FROM sessions WHERE id = ?").run(s.id);

    let simSubjectId: string | null = null;
    if (items.some((i) => i.type === "SIMULADO")) {
      const found = db.prepare("SELECT id FROM subjects WHERE user_id = ? AND name = ?").get(uid, SIM_SUBJECT) as any;
      if (found) simSubjectId = found.id;
      else {
        simSubjectId = crypto.randomUUID();
        const max = (db.prepare("SELECT COALESCE(MAX(sort_order), -1) m FROM subjects WHERE user_id = ?").get(uid) as any).m;
        db.prepare("INSERT INTO subjects (id, user_id, name, weight, color, sort_order) VALUES (?, ?, ?, 0, '#64748B', ?)").run(simSubjectId, uid, SIM_SUBJECT, max + 1);
      }
    }
    const ins = db.prepare(
      `INSERT INTO sessions (id, user_id, subject_id, topic_id, date, type, status, minutes, questions, correct, note, origin_session_id, auto)
       VALUES (?, ?, ?, ?, ?, ?, 'TODO', ?, 0, 0, ?, ?, 1)`
    );
    for (const i of items) ins.run(i.id, uid, i.subjectId || simSubjectId, i.topicId, i.date, i.type, i.minutes, i.note || null, i.originId);
  })();

  res.json({ applied: true, created: items.length, summary, sample, calendarSync: triggerAutoSync(uid) });
});

export default router;
