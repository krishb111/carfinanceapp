import pg from "pg";
import { config } from "../config.js";

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  // Tiger's console shows the URL without the password, so allow it separately
  password: process.env.DB_PASSWORD || undefined,
  ssl: { rejectUnauthorized: false },
});
