import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const env = {
  port: toInt(process.env.PORT, 3000),
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: toInt(process.env.DB_PORT, 5432),
    name: process.env.DB_NAME ?? "benchmark",
    user: process.env.DB_USER ?? "dweb",
    password: process.env.DB_PASSWORD ?? "1234",
    poolMax: toInt(process.env.DB_POOL_MAX, 10)
  }
};

