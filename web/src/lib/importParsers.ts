import * as XLSX from "xlsx";

export interface ImportPayload {
  subjects: Record<string, string[]>;
  weights: Record<string, number>;
  done: string[];
  warnings?: string[];
  sessions: {
    date: string;
    subject: string;
    type: string;
    topic?: string | null;
    minutes?: number | null;
    questions?: number;
    correct?: number;
    status?: string;
    note?: string | null;
  }[];
}

const empty = (): ImportPayload => ({ subjects: {}, weights: {}, done: [], sessions: [] });
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
const norm = (v: unknown) =>
  str(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const toNum = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function toISO(v: unknown): string | null {
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  const s = str(v);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

function add(p: ImportPayload, subject: string, topic?: string) {
  if (!p.subjects[subject]) p.subjects[subject] = [];
  if (topic && !p.subjects[subject].includes(topic)) p.subjects[subject].push(topic);
}

const findSheet = (wb: XLSX.WorkBook, ...names: string[]) => {
  const want = names.map(norm);
  const name = wb.SheetNames.find((n) => want.includes(norm(n)));
  return name ? wb.Sheets[name] : null;
};
const rowsOf = (ws: XLSX.WorkSheet) => XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });

function typeOf(raw: string) {
  const t = raw.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (t.startsWith("REVISAO")) {
    if (t.includes("24")) return "REVISÃO 24H";
    if (t.includes("7")) return "REVISÃO 7 DIAS";
    if (t.includes("15")) return "REVISÃO 15 DIAS";
    if (t.includes("30")) return "REVISÃO 30 DIAS";
  }
  if (t.startsWith("SIMULADO")) return "SIMULADO";
  return "ESTUDO";
}

// formato do modelo do Concursei: abas "Edital" e "Diário" com cabeçalhos
function parseTemplate(wb: XLSX.WorkBook, p: ImportPayload) {
  const ed = findSheet(wb, "Edital");
  if (ed) {
    const rows = rowsOf(ed);
    const h = rows.findIndex((r) => r.some((c) => norm(c) === "materia"));
    if (h >= 0) {
      const head = rows[h].map(norm);
      const iM = head.indexOf("materia");
      const iP = head.findIndex((x) => x === "peso");
      const iA = head.findIndex((x) => x === "assunto");
      const iC = head.findIndex((x) => x.startsWith("concluido"));
      for (const r of rows.slice(h + 1)) {
        const subject = str(r[iM]);
        if (!subject) continue;
        const w = iP >= 0 ? toNum(r[iP]) : null;
        if (w) p.weights[subject] = Math.round(w);
        const topic = iA >= 0 ? str(r[iA]) : "";
        add(p, subject, topic || undefined);
        if (topic && iC >= 0 && ["sim", "s", "1", "x"].includes(norm(r[iC]))) p.done.push(`${subject}|${topic}`);
      }
    }
  }
  const di = findSheet(wb, "Diário", "Diario");
  if (di) {
    const rows = rowsOf(di);
    const h = rows.findIndex((r) => r.some((c) => norm(c) === "data") && r.some((c) => norm(c) === "materia"));
    if (h >= 0) {
      const head = rows[h].map(norm);
      const col = (n: string) => head.findIndex((x) => x === n || x.startsWith(n));
      const iD = col("data"), iM = col("materia"), iA = col("assunto"), iT = col("tipo"), iMin = col("minutos"), iS = col("status"), iQ = col("questoes"), iC = col("acertos"), iN = col("anotacao");
      for (const r of rows.slice(h + 1)) {
        const date = toISO(r[iD]);
        const subject = str(r[iM]);
        if (!date || !subject) continue;
        add(p, subject);
        p.sessions.push({
          date,
          subject,
          type: typeOf(str(r[iT]) || "ESTUDO"),
          topic: iA >= 0 ? str(r[iA]) || null : null,
          minutes: iMin >= 0 ? toNum(r[iMin]) : null,
          questions: iQ >= 0 ? toNum(r[iQ]) ?? 0 : 0,
          correct: iC >= 0 ? toNum(r[iC]) ?? 0 : 0,
          status: iS >= 0 ? str(r[iS]) || "A FAZER" : "A FAZER",
          note: iN >= 0 ? str(r[iN]) || null : null,
        });
      }
    }
  }
}

// formato da planilha de cronograma antiga (EDITAL com cabeçalhos por matéria + "Diário de estudo")
function parseLegacy(wb: XLSX.WorkBook, p: ImportPayload) {
  const ed = findSheet(wb, "EDITAL");
  if (ed && !Object.keys(p.subjects).length) {
    const rows = rowsOf(ed);
    let cur = "";
    rows.forEach((r, i) => {
      const a = str(r[0]);
      const next = rows[i + 1];
      if (a && r.slice(1, 11).every((c) => c === null || c === "") && next && norm(next[1]).includes("estudada")) {
        cur = a;
        add(p, cur);
        return;
      }
      if (cur && a && ["sim", "nao"].includes(norm(r[1]))) {
        add(p, cur, a);
        if (norm(r[1]) === "sim") p.done.push(`${cur}|${a}`);
      }
    });
  }
  const dh = findSheet(wb, "DICA DE HORAS DE ESTUDO");
  if (dh) {
    for (const r of rowsOf(dh)) {
      const name = str(r[0]);
      const w = toNum(r[1]);
      if (name && w && name.toUpperCase() !== "TOTAL" && p.subjects[name]) p.weights[name] = Math.round(w);
    }
  }
  const di = findSheet(wb, "Diário de estudo");
  if (di && !p.sessions.length) {
    const rows = rowsOf(di);
    const h = rows.findIndex((r) => norm(r[0]) === "data" && norm(r[3]) === "materia");
    if (h >= 0) {
      for (const r of rows.slice(h + 1)) {
        const date = toISO(r[0]);
        const subject = str(r[3]);
        if (!date || !subject) continue;
        add(p, subject);
        p.sessions.push({
          date,
          subject,
          type: typeOf(str(r[4]) || "ESTUDO"),
          topic: str(r[5]) || null,
          minutes: toNum(r[6]),
          questions: toNum(r[7]) ?? 0,
          correct: toNum(r[8]) ?? 0,
          status: str(r[9]) || "A FAZER",
        });
      }
    }
  }
}

export async function parseWorkbook(file: File): Promise<ImportPayload> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const p = empty();
  parseTemplate(wb, p);
  parseLegacy(wb, p);
  return p;
}

const isHeading = (line: string) => {
  const letters = line.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (/^(mat[eé]ria|disciplina)\s*[:\-–]/i.test(line)) return true;
  if (/[:：]\s*$/.test(line) && line.length < 90 && line.split(/\s+/).length <= 8) return true;
  // MAIÚSCULAS: precisa parecer título (2+ palavras ou nome longo) e não ter números/barras (ex.: "CF/88", "ICMS")
  const allCaps = letters.length >= 4 && letters === letters.toUpperCase() && line.length < 90 && !/[\d/]/.test(line);
  return allCaps && (/\s/.test(line.trim()) || letters.length >= 8);
};

const cleanHeading = (line: string) =>
  line
    .replace(/^(mat[eé]ria|disciplina)\s*[:\-–]\s*/i, "")
    .replace(/[:：]\s*$/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();

const cleanTopic = (line: string) => line.replace(/^\s*(?:\d+(?:\.\d+)*[.)\-–]?|[a-z]\)|[-•*▪●–])\s*/i, "").trim();

// texto colado do edital: linhas em MAIÚSCULAS (ou terminadas em ":") viram matérias; as demais, assuntos
export function parsePastedText(text: string): ImportPayload {
  const p = empty();
  let cur = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (isHeading(line)) {
      cur = cleanHeading(line);
      if (cur) add(p, cur);
      continue;
    }
    if (!cur) continue;
    const topic = cleanTopic(line);
    if (topic.length >= 3) add(p, cur, topic);
  }
  const empties = Object.keys(p.subjects).filter((s) => !p.subjects[s].length);
  for (const s of empties) delete p.subjects[s];
  if (empties.length) p.warnings = [`Ignorei ${empties.length} título(s) sem assuntos abaixo: ${empties.slice(0, 5).join(", ")}`];
  return p;
}

export function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const edital = XLSX.utils.aoa_to_sheet([
    ["Matéria", "Peso", "Assunto", "Concluído"],
    ["LÍNGUA PORTUGUESA", 1, "Interpretação de texto", "NÃO"],
    ["LÍNGUA PORTUGUESA", 1, "Ortografia e acentuação", "NÃO"],
    ["DIREITO CONSTITUCIONAL", 2, "Direitos e garantias fundamentais", "SIM"],
  ]);
  edital["!cols"] = [{ wch: 30 }, { wch: 8 }, { wch: 60 }, { wch: 12 }];
  const diario = XLSX.utils.aoa_to_sheet([
    ["Data", "Matéria", "Assunto", "Tipo", "Minutos", "Status", "Questões", "Acertos", "Anotação"],
    ["2026-10-05", "LÍNGUA PORTUGUESA", "Interpretação de texto", "ESTUDO", 120, "A FAZER", 0, 0, ""],
    ["2026-10-06", "LÍNGUA PORTUGUESA", "Interpretação de texto", "REVISÃO 24H", 20, "A FAZER", 0, 0, ""],
  ]);
  diario["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 40 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 30 }];
  const help = XLSX.utils.aoa_to_sheet([
    ["Como preencher"],
    ["Aba Edital: uma linha por assunto. Peso de 1 a 10 (repita o mesmo peso nas linhas da matéria). Concluído: SIM ou NÃO."],
    ["Aba Diário (opcional): Data no formato AAAA-MM-DD ou DD/MM/AAAA."],
    ["Tipo: ESTUDO, SIMULADO, REVISÃO 24H, REVISÃO 7 DIAS, REVISÃO 15 DIAS ou REVISÃO 30 DIAS."],
    ["Status: A FAZER, FEITO ou ADIADO. Matérias e assuntos que não existirem são criados automaticamente."],
    ["Importar de novo o mesmo arquivo não duplica nada."],
  ]);
  help["!cols"] = [{ wch: 120 }];
  XLSX.utils.book_append_sheet(wb, edital, "Edital");
  XLSX.utils.book_append_sheet(wb, diario, "Diário");
  XLSX.utils.book_append_sheet(wb, help, "Como preencher");
  XLSX.writeFile(wb, "modelo-concursei.xlsx");
}
