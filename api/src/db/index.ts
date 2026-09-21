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
if (!userCols.some((c) => c.name === "exam_name")) {
  db.exec("ALTER TABLE users ADD COLUMN exam_name TEXT");
  db.exec("UPDATE users SET exam_name = 'MPMS — Analista TI / Desenvolvimento de Sistemas'");
}

export function nowIso() {
  return new Date().toISOString();
}
