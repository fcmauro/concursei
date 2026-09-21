import { useEffect } from "react";
import { api } from "../api/client";
import { localISO } from "../lib/date";

export const REMINDERS_KEY = "concursei.reminders";

const notify = (title: string, body: string) => {
  try {
    new Notification(title, { body, icon: "/favicon.svg" });
  } catch {
    /* ignorado: navegador sem suporte */
  }
};

// roda enquanto o app está aberto: aviso de revisões do dia e do início da janela de estudo
export default function Lembretes() {
  useEffect(() => {
    let availability: { weekday: number; start_time: string }[] | null = null;

    async function tick() {
      if (localStorage.getItem(REMINDERS_KEY) !== "1" || typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const now = new Date();
      const day = localISO(now);

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("concursei.reminders.start.") && !k.startsWith(`concursei.reminders.start.${day}.`)) localStorage.removeItem(k);
      }

      const lastReviews = localStorage.getItem("concursei.reminders.reviews");
      if (lastReviews !== day && now.getHours() >= 7) {
        try {
          const d = await api.getDashboard(day, day, day);
          localStorage.setItem("concursei.reminders.reviews", day);
          const n = d.reviews.due + d.reviews.overdue;
          if (n > 0) notify("Revisões pendentes", `Você tem ${n} ${n === 1 ? "revisão" : "revisões"} para fazer (${d.reviews.overdue} atrasadas).`);
        } catch {
          /* sessão expirada ou API fora do ar: tenta de novo no próximo ciclo */
        }
      }

      try {
        availability ||= await api.getAvailability();
        const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const key = `concursei.reminders.start.${day}.${hhmm}`;
        if (availability!.some((w) => w.weekday === now.getDay() && w.start_time === hhmm) && !localStorage.getItem(key)) {
          localStorage.setItem(key, "1");
          notify("Hora de estudar", "Sua janela de estudo começou agora. Abra o Diário e comece pelo cronômetro.");
        }
      } catch {
        /* ignora */
      }
    }

    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  return null;
}
