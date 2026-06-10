import express from "express";
import { query } from "../config/db.js";

const router = express.Router();

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parseId = (value) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    throw httpError(400, "User id must be a positive integer.");
  }

  return parsed;
};

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
      throw httpError(400, "name and email are required.");
    }

    const result = await query(
      `
        INSERT INTO users (name, email)
        VALUES ($1, $2)
        RETURNING
          user_id AS "userId",
          name,
          email,
          created_at AS "createdAt"
      `,
      [name, email]
    );

    res.status(201).json(result.rows[0]);
  })
);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const result = await query(
      `
        SELECT
          user_id AS "userId",
          name,
          email,
          created_at AS "createdAt"
        FROM users
        ORDER BY user_id
      `
    );

    res.json(result.rows);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = parseId(req.params.id);

    const result = await query(
      `
        SELECT
          user_id AS "userId",
          name,
          email,
          created_at AS "createdAt"
        FROM users
        WHERE user_id = $1
      `,
      [userId]
    );

    if (result.rowCount === 0) {
      throw httpError(404, "User not found.");
    }

    res.json(result.rows[0]);
  })
);

export default router;

