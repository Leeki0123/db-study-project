import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import groupsRouter from "./routes/groups.js";
import usersRouter from "./routes/users.js";
import { testConnection } from "./config/db.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

app.use(cors());
app.use(express.json());
app.use(express.static(frontendDir));

app.get("/api", (_req, res) => {
  res.json({
    project: "db-study-project",
    message: "Study recruitment API is running.",
    endpoints: ["/health", "/users", "/groups"]
  });
});

app.get("/health", async (_req, res, next) => {
  try {
    const dbState = await testConnection();

    res.json({
      status: "ok",
      databaseTime: dbState.now
    });
  } catch (error) {
    next(error);
  }
});

app.use("/users", usersRouter);
app.use("/groups", groupsRouter);

app.get("/", (_req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

app.use((error, _req, res, _next) => {
  const statusCode =
    error.statusCode ??
    (error.code === "23505"
      ? 409
      : error.code === "23503"
        ? 400
        : error.code === "23514"
          ? 400
          : 500);

  res.status(statusCode).json({
    message: error.message || "Internal server error.",
    code: error.code ?? null
  });
});

export default app;
