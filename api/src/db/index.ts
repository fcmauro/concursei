import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "..", "..", "data.db");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);

const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
for (const [col, ddl] of [
  ["exam_date", "ALTER TABLE users ADD COLUMN exam_date TEXT"],
  ["prep_date", "ALTER TABLE users ADD COLUMN prep_date TEXT"],
  ["goal_hours_week", "ALTER TABLE users ADD COLUMN goal_hours_week INTEGER NOT NULL DEFAULT 18"],
  ["goal_questions_week", "ALTER TABLE users ADD COLUMN goal_questions_week INTEGER NOT NULL DEFAULT 0"],
] as const) {
  if (!userCols.some((c) => c.name === col)) db.exec(ddl);
}
const sessionCols = db.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
if (!sessionCols.some((c) => c.name === "auto")) db.exec("ALTER TABLE sessions ADD COLUMN auto INTEGER NOT NULL DEFAULT 0");

const topicCols = db.prepare("PRAGMA table_info(topics)").all() as { name: string }[];
if (!topicCols.some((c) => c.name === "done")) db.exec("ALTER TABLE topics ADD COLUMN done INTEGER NOT NULL DEFAULT 0");

if (!userCols.some((c) => c.name === "exam_name")) {
  db.exec("ALTER TABLE users ADD COLUMN exam_name TEXT");
  db.exec("UPDATE users SET exam_name = 'MPMS — Analista TI / Desenvolvimento de Sistemas'");
}

export function nowIso() {
  return new Date().toISOString();
}
