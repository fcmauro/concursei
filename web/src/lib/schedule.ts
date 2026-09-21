export interface Win {
  start_time: string;
  end_time: string;
}

export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const overlap = (a1: number, a2: number, b1: number, b2: number) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));

export function dayBudget(windows: Win[], events: Win[], plannedMin: number) {
  const avail = windows.reduce((acc, w) => acc + (toMin(w.end_time) - toMin(w.start_time)), 0);
  const blocked = windows.reduce(
    (acc, w) => acc + events.reduce((a, e) => a + overlap(toMin(w.start_time), toMin(w.end_time), toMin(e.start_time), toMin(e.end_time)), 0),
    0
  );
  const usable = Math.max(0, avail - blocked);
  return { avail, blocked, usable, free: usable - plannedMin };
}

export const WEEKDAYS = [
  { n: 1, label: "Segunda" },
  { n: 2, label: "Terça" },
  { n: 3, label: "Quarta" },
  { n: 4, label: "Quinta" },
  { n: 5, label: "Sexta" },
  { n: 6, label: "Sábado" },
  { n: 0, label: "Domingo" },
];
