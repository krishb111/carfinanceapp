import dotenv from "dotenv";
import path from "node:path";

// .env lives at the repo root
dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env") });

export const config = {
  port: Number(process.env.API_PORT ?? 4000),
  nessieKey: process.env.NESSIE_API_KEY ?? "",
  serpApiKey: process.env.SERPAPI_KEY ?? "",
  geminiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest",
  databaseUrl: process.env.DATABASE_URL ?? "",
};
