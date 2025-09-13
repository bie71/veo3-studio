import express from "express";
import cors from "cors";
import { PORT } from "./env.js";
import { veo3Router } from "./routes/veo3.js";
import { resolve } from "node:path";
import { log } from "./utils/logger.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static serve jobs outputs
app.use("/jobs", express.static(resolve(process.cwd(), "jobs")));

app.use("/api/veo3", veo3Router);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  log(`Server listening on http://localhost:${PORT}`);
});

