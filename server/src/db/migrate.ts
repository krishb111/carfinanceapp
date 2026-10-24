import fs from "node:fs";
import path from "node:path";
import { pool } from "./pool.js";

const sql = fs.readFileSync(path.resolve(import.meta.dirname, "../../src/db/schema.sql"), "utf8");
await pool.query(sql);
console.log("Schema applied");
await pool.end();
