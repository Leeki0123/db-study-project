import { pool } from "../config/db.js";

const ALLOWED_ISOLATION_LEVELS = new Set(["READ COMMITTED", "SERIALIZABLE"]);

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const normalizeIsolationLevel = (value) => {
  const normalized = String(value ?? "READ COMMITTED").trim().toUpperCase();

  if (!ALLOWED_ISOLATION_LEVELS.has(normalized)) {
    throw httpError(
      400,
      "isolationLevel must be either READ COMMITTED or SERIALIZABLE."
    );
  }

  return normalized;
};

export const joinStudyGroup = async ({ groupId, userId, isolationLevel }) => {
  const level = normalizeIsolationLevel(isolationLevel);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(`SET TRANSACTION ISOLATION LEVEL ${level}`);

    const userResult = await client.query(
      `
        SELECT user_id
        FROM users
        WHERE user_id = $1
      `,
      [userId]
    );

    if (userResult.rowCount === 0) {
      throw httpError(404, "User not found.");
    }

    const groupResult = await client.query(
      `
        SELECT group_id, max_members
        FROM study_groups
        WHERE group_id = $1
      `,
      [groupId]
    );

    if (groupResult.rowCount === 0) {
      throw httpError(404, "Study group not found.");
    }

    const duplicateResult = await client.query(
      `
        SELECT 1
        FROM study_members
        WHERE group_id = $1
          AND user_id = $2
      `,
      [groupId, userId]
    );

    if (duplicateResult.rowCount > 0) {
      throw httpError(409, "User is already a member of this study group.");
    }

    const countResult = await client.query(
      `
        SELECT COUNT(*)::int AS member_count
        FROM study_members
        WHERE group_id = $1
      `,
      [groupId]
    );

    const memberCount = countResult.rows[0].member_count;
    const maxMembers = groupResult.rows[0].max_members;

    if (memberCount >= maxMembers) {
      throw httpError(409, "Study group is already full.");
    }

    await client.query(
      `
        INSERT INTO study_members (group_id, user_id)
        VALUES ($1, $2)
      `,
      [groupId, userId]
    );

    await client.query("COMMIT");

    return {
      groupId,
      userId,
      isolationLevel: level,
      memberCount: memberCount + 1
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Ignore rollback failures and surface the original error.
    }

    if (error.code === "40001") {
      error.statusCode = 409;
      error.message =
        "Serializable transaction was rolled back due to a concurrency conflict.";
    }

    throw error;
  } finally {
    client.release();
  }
};

