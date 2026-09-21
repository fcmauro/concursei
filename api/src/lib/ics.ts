export interface IcsEvent {
  uid: string;
  summary: string;
  description: string;
  category: string;
  start: string; // horário local flutuante: YYYYMMDDTHHMMSS
  end: string;
  seq: number;
  alarm: boolean;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 73) {
    let cut = 73;
    while (Buffer.byteLength(rest.slice(0, cut)) > 73) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out;
}

const utcStamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function buildIcs(e: IcsEvent) {
  const now = utcStamp();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Concursei//PT-BR//",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${now}`,
    `LAST-MODIFIED:${now}`,
    `SEQUENCE:${e.seq}`,
    `DTSTART:${e.start}`,
    `DTEND:${e.end}`,
    `SUMMARY:${esc(e.summary)}`,
    `DESCRIPTION:${esc(e.description)}`,
    `CATEGORIES:${esc(e.category)}`,
    "TRANSP:OPAQUE",
  ];
  if (e.alarm) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.summary)}`, "TRIGGER:-PT10M", "END:VALARM");
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.flatMap(fold).join("\r\n") + "\r\n";
}
