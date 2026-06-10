\set user_id random(1, 20)
\set group_id random(1, 5)

BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

WITH target_group AS (
    SELECT group_id, max_members
    FROM study_groups
    WHERE group_id = :group_id
),
current_members AS (
    SELECT COUNT(*)::int AS member_count
    FROM study_members
    WHERE group_id = :group_id
),
insert_member AS (
    INSERT INTO study_members (group_id, user_id)
    SELECT :group_id, :user_id
    FROM target_group tg
    CROSS JOIN current_members cm
    WHERE cm.member_count < tg.max_members
      AND NOT EXISTS (
          SELECT 1
          FROM study_members sm
          WHERE sm.group_id = :group_id
            AND sm.user_id = :user_id
      )
    ON CONFLICT DO NOTHING
    RETURNING 1
)
SELECT COUNT(*) AS inserted_count
FROM insert_member;

COMMIT;

