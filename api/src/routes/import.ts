import { Router } from "express";
import { AuthedRequest, requireAuth } from "../lib/auth";
import { importData, validateImport } from "../lib/importData";

const router = Router();
router.use(requireAuth);

// POST /import { subjects, weights, done, sessions, dryRun }
router.post("/", (req: AuthedRequest, res) => {
  if (typeof req.body !== "object" || req.body === null || Array.isArray(req.body)) {
    return res.status(400).json({ error: "Conteúdo inválido" });
  }
  const { dryRun, ...data } = req.body;
  const problem = validateImport(data);
  if (problem) return res.status(400).json({ error: problem });
  const stats = importData(req.userId!, data, Boolean(dryRun));
  res.json({ dryRun: Boolean(dryRun), stats });
});

export default router;
