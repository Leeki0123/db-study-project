-- Users: 10,000명 생성
INSERT INTO users (name, email)
SELECT
    'User ' || n,
    'user' || LPAD(n::text, 5, '0') || '@example.com'
FROM generate_series(1, 10000) AS n;

-- Study Groups: 100개 생성 (creator_id를 1~100 사용자에 분산)
INSERT INTO study_groups (creator_id, title, description, max_members)
SELECT
    n AS creator_id,
    'Study Group ' || n,
    'Study group number ' || n || ' for benchmarking.',
    30 + (n % 71)  -- max_members: 30~100 사이로 분산 (CHECK 2~100 만족)
FROM generate_series(1, 100) AS n;

-- Study Members: 각 스터디에 생성자를 첫 번째 멤버로 추가
INSERT INTO study_members (group_id, user_id)
SELECT group_id, creator_id
FROM study_groups;
