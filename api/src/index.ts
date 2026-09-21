import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import subjectRoutes from "./routes/subjects";
import sessionRoutes from "./routes/sessions";
import statsRoutes from "./routes/stats";
import meRoutes from "./routes/me";
import scheduleRoutes from "./routes/schedule";
import simuladoRoutes from "./routes/simulados";
import errorRoutes from "./routes/errors";
import planRoutes from "./routes/plan";
import importRoutes from "./routes/import";

const app = express();
app.set("trust proxy", true);
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN.split(",").map((s) => s.trim()) } : undefined));
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/subjects", subjectRoutes);
app.use("/sessions", sessionRoutes);
app.use("/stats", statsRoutes);
app.use("/me", meRoutes);
app.use("/schedule", scheduleRoutes);
app.use("/simulados", simuladoRoutes);
app.use("/errors", errorRoutes);
app.use("/plan", planRoutes);
app.use("/import", importRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
