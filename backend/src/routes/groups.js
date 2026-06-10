import express from "express";
import { pool, query } from "../config/db.js";
import { joinStudyGroup } from "../services/groupService.js";

const router = express.Router();

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parseId = (value, fieldName) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    throw httpError(400, `${fieldName} must be a positive integer.`);
  }

  return parsed;
};

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const creatorId = parseId(req.body.creatorId, "creatorId");
    const { title, description = "" } = req.body;
    const maxMembers = parseId(req.body.maxMembers, "maxMembers");

    if (!title) {
      throw httpError(400, "title is required.");
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const insertGroupResult = await client.query(
        `
          INSERT INTO study_groups (creator_id, title, description, max_members)
          VALUES ($1, $2, $3, $4)
          RETURNING
            group_id AS "groupId",
            creator_id AS "creatorId",
            title,
            description,
            max_members AS "maxMembers",
            created_at AS "createdAt"
        `,
        [creatorId, title, description, maxMembers]
      );

      const group = insertGroupResult.rows[0];

      await client.query(
        `
          INSERT INTO study_members (group_id, user_id)
          VALUES ($1, $2)
        `,
        [group.groupId, creatorId]
      );

      await client.query("COMMIT");

      res.status(201).json({
        ...group,
        memberCount: 1
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  })
);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const result = await query(
      `
        SELECT
          g.group_id AS "groupId",
          g.creator_id AS "creatorId",
          u.name AS "creatorName",
          g.title,
          g.description,
          g.max_members AS "maxMembers",
          g.created_at AS "createdAt",
          COUNT(sm.user_id)::int AS "memberCount"
        FROM study_groups g
        JOIN users u ON u.user_id = g.creator_id
        LEFT JOIN study_members sm ON sm.group_id = g.group_id
        GROUP BY g.group_id, u.name
        ORDER BY g.group_id
      `
    );

    res.json(result.rows);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const groupId = parseId(req.params.id, "groupId");

    const groupResult = await query(
      `
        SELECT
          g.group_id AS "groupId",
          g.creator_id AS "creatorId",
          u.name AS "creatorName",
          g.title,
          g.description,
          g.max_members AS "maxMembers",
          g.created_at AS "createdAt",
          COUNT(sm.user_id)::int AS "memberCount"
        FROM study_groups g
        JOIN users u ON u.user_id = g.creator_id
        LEFT JOIN study_members sm ON sm.group_id = g.group_id
        WHERE g.group_id = $1
        GROUP BY g.group_id, u.name
      `,
      [groupId]
    );

    if (groupResult.rowCount === 0) {
      throw httpError(404, "Study group not found.");
    }

    const membersResult = await query(
      `
        SELECT
          u.user_id AS "userId",
          u.name,
          u.email,
          sm.joined_at AS "joinedAt"
        FROM study_members sm
        JOIN users u ON u.user_id = sm.user_id
        WHERE sm.group_id = $1
        ORDER BY sm.joined_at, u.user_id
      `,
      [groupId]
    );

    res.json({
      ...groupResult.rows[0],
      members: membersResult.rows
    });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const groupId = parseId(req.params.id, "groupId");
    const { title, description, maxMembers } = req.body;
    const parsedMaxMembers =
      maxMembers === undefined ? null : parseId(maxMembers, "maxMembers");

    if (title === undefined && description === undefined && parsedMaxMembers === null) {
      throw httpError(
        400,
        "At least one of title, description, or maxMembers must be provided."
      );
    }

    const client = await pool.connect();

    let updateResult;

    try {
      await client.query("BEGIN");

      const lockResult = await client.query(
        `
          SELECT group_id
          FROM study_groups
          WHERE group_id = $1
          FOR UPDATE
        `,
        [groupId]
      );

      if (lockResult.rowCount === 0) {
        throw httpError(404, "Study group not found.");
      }

      const currentState = await client.query(
        `
          SELECT COUNT(user_id)::int AS member_count
          FROM study_members
          WHERE group_id = $1
        `,
        [groupId]
      );

      if (
        parsedMaxMembers !== null &&
        parsedMaxMembers < currentState.rows[0].member_count
      ) {
        throw httpError(
          400,
          "maxMembers cannot be smaller than the current member count."
        );
      }

      updateResult = await client.query(
      `
        UPDATE study_groups
        SET
          title = COALESCE($2, title),
          description = COALESCE($3, description),
          max_members = COALESCE($4, max_members)
        WHERE group_id = $1
        RETURNING
          group_id AS "groupId",
          creator_id AS "creatorId",
          title,
          description,
          max_members AS "maxMembers",
          created_at AS "createdAt"
      `,
        [
          groupId,
          title ?? null,
          description ?? null,
          parsedMaxMembers
        ]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.json(updateResult.rows[0]);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const groupId = parseId(req.params.id, "groupId");

    const deleteResult = await query(
      `
        DELETE FROM study_groups
        WHERE group_id = $1
        RETURNING
          group_id AS "groupId",
          title
      `,
      [groupId]
    );

    if (deleteResult.rowCount === 0) {
      throw httpError(404, "Study group not found.");
    }

    res.json({
      message: "Study group deleted.",
      group: deleteResult.rows[0]
    });
  })
);

router.post(
  "/:id/join",
  asyncHandler(async (req, res) => {
    const groupId = parseId(req.params.id, "groupId");
    const userId = parseId(req.body.userId, "userId");
    const { isolationLevel } = req.body;

    const result = await joinStudyGroup({
      groupId,
      userId,
      isolationLevel
    });

    res.status(201).json(result);
  })
);

router.delete(
  "/:id/leave",
  asyncHandler(async (req, res) => {
    const groupId = parseId(req.params.id, "groupId");
    const userId = parseId(req.body.userId, "userId");

    const deleteResult = await query(
      `
        DELETE FROM study_members
        WHERE group_id = $1
          AND user_id = $2
        RETURNING
          group_id AS "groupId",
          user_id AS "userId"
      `,
      [groupId, userId]
    );

    if (deleteResult.rowCount === 0) {
      throw httpError(404, "Study membership not found.");
    }

    res.json({
      message: "Study participation cancelled.",
      membership: deleteResult.rows[0]
    });
  })
);

export default router;

