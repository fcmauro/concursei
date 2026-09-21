import fs from "fs";
import { db } from "../db";
import { importData, validateImport } from "../lib/importData";

// uso: node dist/scripts/importPlan.js <email> <arquivo.json>
const [email, file] = process.argv.slice(2);
if (!email || !file) {
  console.error("uso: node dist/scripts/importPlan.js <email> <arquivo.json>");
  process.exit(1);
}
const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string } | undefined;
if (!user) {
  console.error(`Usuário ${email} não encontrado`);
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, "utf-8"));
const problem = validateImport(data);
if (problem) {
  console.error(problem);
  process.exit(1);
}
console.log(`Importado para ${email}:`, importData(user.id, data));
