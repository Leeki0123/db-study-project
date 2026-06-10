import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  max: env.db.poolMax
});

export const query = (text, params = []) => pool.query(text, params);

export const testConnection = async () => {
  const result = await query("SELECT NOW() AS now");
  return result.rows[0];
};

