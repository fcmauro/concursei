import crypto from "crypto";
import { db } from "../db";
import { DEFAULT_SUBJECTS } from "../lib/seedContent";

const RENAMES: Record<string, string> = {
  "Padrões SOAP, REST, XML, XSLT, WSDL, JSON, RMI": "Padrões SOAP, REST, XML, XSLT, WSDL, UDDI, JSON, RMI",
};

const users = db.prepare("SELECT id, email FROM users WHERE exam_name LIKE 'MPMS%'").all() as { id: string; email: string }[];

const tx = db.transaction(() => {
  for (const u of users) {
    for (const [si, def] of DEFAULT_SUBJECTS.entries()) {
      let subject = db
        .prepare("SELECT id FROM subjects WHERE user_id = ? AND name = ?")
        .get(u.id, def.name) as { id: string } | undefined;
      if (!subject) {
        const id = crypto.randomUUID();
        db.prepare("INSERT INTO subjects (id, user_id, name, weight, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)").run(id, u.id, def.name, def.weight, def.color, si);
        subject = { id };
      } else {
        db.prepare("UPDATE subjects SET color = ?, weight = ? WHERE id = ?").run(def.color, def.weight, subject.id);
      }
      for (const [from, to] of Object.entries(RENAMES)) {
        db.prepare("UPDATE topics SET name = ? WHERE subject_id = ? AND name = ?").run(to, subject.id, from);
      }
      const existing = new Set(
        (db.prepare("SELECT name FROM topics WHERE subject_id = ?").all(subject.id) as { name: string }[]).map((t) => t.name)
      );
      let order = (db.prepare("SELECT COALESCE(MAX(sort_order),-1) m FROM topics WHERE subject_id = ?").get(subject.id) as { m: number }).m;
      for (const name of def.topics) {
        if (existing.has(name)) continue;
        db.prepare("INSERT INTO topics (id, subject_id, name, sort_order) VALUES (?, ?, ?, ?)").run(crypto.randomUUID(), subject.id, name, ++order);
        console.log(`[${u.email}] + ${def.name}: ${name}`);
      }
    }
  }
});
tx();
console.log(`Sincronizado para ${users.length} usuário(s).`);
