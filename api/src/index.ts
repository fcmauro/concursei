import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import subjectRoutes from "./routes/subjects";
import sessionRoutes from "./routes/sessions";
import statsRoutes from "./routes/stats";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/subjects", subjectRoutes);
app.use("/sessions", sessionRoutes);
app.use("/stats", statsRoutes);

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
