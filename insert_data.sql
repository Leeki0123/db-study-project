TRUNCATE study_members, study_groups, users RESTART IDENTITY CASCADE;

INSERT INTO users (name, email)
SELECT
    'User ' || n,
    'user' || LPAD(n::text, 5, '0') || '@example.com'
FROM generate_series(1, 10000) AS n;

INSERT INTO study_groups (creator_id, title, description, max_members)
SELECT
    n AS creator_id,
    'Study Group ' || n,
    'Study group number ' || n || ' for benchmarking.',
    30 + (n % 71)
FROM generate_series(1, 100) AS n;

INSERT INTO study_members (group_id, user_id)
SELECT group_id, creator_id
FROM study_groups;
