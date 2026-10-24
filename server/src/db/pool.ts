import pg from "pg";
import { config } from "../config.js";

// Tiger Cloud requires TLS; sslmode is stripped from the URL so this setting applies
export const pool = new pg.Pool({
  connectionString: config.databaseUrl.replace(/[?&]sslmode=[^&]*/, ""),
  ssl: { rejectUnauthorized: false },
});
