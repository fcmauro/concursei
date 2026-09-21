import { Router } from "express";
import crypto from "crypto";
import { db, nowIso } from "../db";
import { hashPassword, verifyPassword, signToken } from "../lib/auth";
import { DEFAULT_SUBJECTS } from "../lib/seedContent";

const router = Router();

router.post("/register", (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: "email, password e name são obrigatórios" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "E-mail já cadastrado" });
  }

  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  db.prepare(
    "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)"
  ).run(userId, email, passwordHash, name);

  // seed default subjects/topics for the new user (cargo 405 MPMS)
  const insertSubject = db.prepare(
    "INSERT INTO subjects (id, user_id, name, weight, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertTopic = db.prepare(
    "INSERT INTO topics (id, subject_id, name, sort_order) VALUES (?, ?, ?, ?)"
  );
  const seedTx = db.transaction(() => {
    DEFAULT_SUBJECTS.forEach((s, si) => {
      const subjectId = crypto.randomUUID();
      insertSubject.run(subjectId, userId, s.name, s.weight, s.color, si);
      s.topics.forEach((t, ti) => {
        insertTopic.run(crypto.randomUUID(), subjectId, t, ti);
      });
    });
  });
  seedTx();

  const token = signToken(userId);
  res.status(201).json({ token, user: { id: userId, email, name } });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email e password são obrigatórios" });
  }
  const user = db
    .prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?")
    .get(email) as any;
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }
  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

export default router;
