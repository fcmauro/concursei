export function localISO(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function formatMinutes(min: number) {
  if (!min) return "0 min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function daysUntil(iso: string) {
  const target = new Date(iso + "T00:00:00").getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86400000);
}

export function weekRange(ref = new Date()) {
  const day = ref.getDay();
  const monday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + (day === 0 ? -6 : 1 - day));
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { from: localISO(monday), to: localISO(sunday) };
}

export const SHORT_DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
