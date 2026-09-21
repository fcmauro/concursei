import { Router } from "express";
import { db } from "../db";
import { AuthedRequest, requireAuth } from "../lib/auth";
import { encrypt } from "../lib/secretBox";
import { connect, friendlyError, getJob, removeAllEvents, startSync, startWipe } from "../lib/calendarSync";

const router = Router();
router.use(requireAuth);

const attempts = new Map<string, number[]>();
const tooMany = (userId: string) => {
  const now = Date.now();
  const list = (attempts.get(userId) || []).filter((t) => now - t < 60_000);
  list.push(now);
  attempts.set(userId, list);
  return list.length > 5;
};

function publicSettings(userId: string) {
  const r = db.prepare("SELECT apple_id, calendar_name, auto_sync, last_sync_at, last_result, last_error FROM calendar_settings WHERE user_id = ?").get(userId) as any;
  if (!r) return { configured: false };
  return {
    configured: true,
    appleId: r.apple_id,
    calendarName: r.calendar_name,
    autoSync: Boolean(r.auto_sync),
    lastSyncAt: r.last_sync_at,
    lastResult: r.last_result ? JSON.parse(r.last_result) : null,
    lastError: r.last_error,
  };
}

router.get("/", (req: AuthedRequest, res) => {
  res.json({ ...publicSettings(req.userId!), job: getJob(req.userId!) });
});

// salva e testa a conexão (a senha nunca volta para o navegador)
router.put("/", async (req: AuthedRequest, res) => {
  const { appleId, appPassword, calendarName, autoSync } = req.body || {};
  const uid = req.userId!;
  if (typeof appleId !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(appleId.trim())) return res.status(400).json({ error: "Apple ID inválido" });
  const name = typeof calendarName === "string" && calendarName.trim() ? calendarName.trim().slice(0, 60) : "Concursei";
  const stored = db.prepare("SELECT password_enc FROM calendar_settings WHERE user_id = ?").get(uid) as { password_enc: string } | undefined;
  if (typeof appPassword !== "string" || !appPassword.trim()) {
    if (!stored) return res.status(400).json({ error: "Informe a senha de app" });
  }
  if (tooMany(uid)) return res.status(429).json({ error: "Muitas tentativas. Aguarde um minuto." });

  try {
    const password = typeof appPassword === "string" && appPassword.trim() ? appPassword.trim() : null;
    const encrypted = password ? encrypt(password) : stored!.password_enc;
    const plain = password ?? (await import("../lib/secretBox")).decrypt(stored!.password_enc);
    const result = await connect(appleId.trim(), plain, name, true);
    if (!result.calendar) return res.status(400).json({ error: `Não consegui achar nem criar o calendário "${name}"` });
    db.prepare(
      `INSERT INTO calendar_settings (user_id, apple_id, password_enc, calendar_name, auto_sync) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET apple_id = excluded.apple_id, password_enc = excluded.password_enc, calendar_name = excluded.calendar_name, auto_sync = excluded.auto_sync, last_error = NULL`
    ).run(uid, appleId.trim(), encrypted, name, autoSync === false ? 0 : 1);
    res.json({ ...publicSettings(uid), calendarCreated: result.created, calendars: result.calendars });
  } catch (e) {
    res.status(400).json({ error: friendlyError(e) });
  }
});

router.post("/sync", (req: AuthedRequest, res) => {
  if (!db.prepare("SELECT 1 FROM calendar_settings WHERE user_id = ?").get(req.userId!)) return res.status(400).json({ error: "Configure o calendário primeiro" });
  res.status(202).json(startSync(req.userId!, Boolean(req.body?.full)));
});

// apaga todos os eventos do Concursei no calendário, mantendo a conexão
router.delete("/events", (req: AuthedRequest, res) => {
  if (!db.prepare("SELECT 1 FROM calendar_settings WHERE user_id = ?").get(req.userId!)) return res.status(400).json({ error: "Configure o calendário primeiro" });
  res.status(202).json(startWipe(req.userId!));
});

router.get("/status", (req: AuthedRequest, res) => {
  res.json({ ...publicSettings(req.userId!), job: getJob(req.userId!) });
});

router.delete("/", async (req: AuthedRequest, res) => {
  const uid = req.userId!;
  let removed = 0;
  if (req.query.removeEvents === "1") {
    try {
      removed = await removeAllEvents(uid);
    } catch {
      /* segue e apaga as credenciais mesmo assim */
    }
  }
  db.transaction(() => {
    db.prepare("DELETE FROM calendar_sync WHERE user_id = ?").run(uid);
    db.prepare("DELETE FROM calendar_settings WHERE user_id = ?").run(uid);
  })();
  res.json({ ok: true, removedEvents: removed });
});

export default router;
