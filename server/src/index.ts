import express from "express";
import cors from "cors";
import { config } from "./config.js";

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

app.listen(config.port, () => {
  console.log(`Smart Next Move API on http://localhost:${config.port}`);
});
