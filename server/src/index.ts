import express from "express";
import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import { config } from "./config.js";
import { nessieRouter } from "./routes/nessie.js";
import { pricesRouter } from "./routes/prices.js";
import { recommendRouter } from "./routes/recommend.js";
import { explainRouter } from "./routes/explain.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    services: {
      nessie: Boolean(config.nessieKey),
      serpapi: Boolean(config.serpApiKey),
      gemini: Boolean(config.geminiKey),
      database: Boolean(config.databaseUrl),
    },
  });
});

app.use("/api/nessie", nessieRouter);
app.use("/api/prices", pricesRouter);
app.use("/api/recommend", recommendRouter);
app.use("/api/explain", explainRouter);

// In production the API also serves the built React app
const clientDist = path.resolve(import.meta.dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(config.port, () => {
  console.log(`Smart Next Move API on http://localhost:${config.port}`);
});
