import { Router } from "express";
import crypto from "crypto";
import { db, nowIso } from "../db";
import { hashPassword, verifyPassword, signToken } from "../lib/auth";
import { DEFAULT_SUBJECTS } from "../lib/seedContent";

const MPMS_EXAM_NAME = "MPMS — Analista TI / Desenvolvimento de Sistemas";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const attempts = new Map<string, { count: number; resetAt: number }>();
function rateLimited(key: string, max = 10, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > max;
}

const registrationOpen = () => process.env.ALLOW_REGISTRATION !== "false";

import { isAdminEmail } from "../lib/admin";

const router = Router();

router.get("/config", (_req, res) => res.json({ registration: registrationOpen() }));

router.post("/register", (req, res) => {
  if (!registrationOpen()) return res.status(403).json({ error: "Cadastro de novas contas desativado neste servidor" });
  if (rateLimited(`reg:${req.ip}`, 20)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
  const { email, password, name, examName, template } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: "email, password e name são obrigatórios" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "E-mail já cadastrado" });
  }

  if (typeof email !== "string" || !EMAIL_RE.test(email)) return res.status(400).json({ error: "E-mail inválido" });
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "A senha precisa ter pelo menos 8 caracteres" });
  }
  const useMpmsTemplate = template === "mpms405";
  const finalExamName: string | null =
    (typeof examName === "string" && examName.trim()) || (useMpmsTemplate ? MPMS_EXAM_NAME : null);
  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  db.prepare(
    "INSERT INTO users (id, email, password_hash, name, exam_name) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, email, passwordHash, name, finalExamName);

  // seed default subjects/topics for the new user (cargo 405 MPMS)
  const insertSubject = db.prepare(
    "INSERT INTO subjects (id, user_id, name, weight, color, sort_order, area) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const insertTopic = db.prepare(
    "INSERT INTO topics (id, subject_id, name, sort_order) VALUES (?, ?, ?, ?)"
  );
  const seedTx = db.transaction(() => {
    DEFAULT_SUBJECTS.forEach((s, si) => {
      const subjectId = crypto.randomUUID();
      insertSubject.run(subjectId, userId, s.name, s.weight, s.color, si, s.area);
      s.topics.forEach((t, ti) => {
        insertTopic.run(crypto.randomUUID(), subjectId, t, ti);
      });
    });
  });
  if (useMpmsTemplate) seedTx();

  const token = signToken(userId);
  res.status(201).json({ token, user: { id: userId, email, name, examName: finalExamName, isAdmin: isAdminEmail(email) } });
});

router.post("/login", (req, res) => {
  if (rateLimited(`login:${req.ip}:${String(req.body?.email || "").toLowerCase()}`)) {
    return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
  }
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email e password são obrigatórios" });
  }
  const user = db
    .prepare("SELECT id, email, name, exam_name, password_hash FROM users WHERE email = ?")
    .get(email) as any;
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }
  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, examName: user.exam_name, isAdmin: isAdminEmail(user.email) } });
});

export default router;
