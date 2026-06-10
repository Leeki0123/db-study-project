INSERT INTO users (name, email)
SELECT
    'User ' || n,
    'user' || LPAD(n::text, 2, '0') || '@example.com'
FROM generate_series(1, 20) AS n;

INSERT INTO study_groups (creator_id, title, description, max_members)
VALUES
    (1, 'PostgreSQL 입문 스터디', '기초 SQL과 스키마 설계를 함께 공부합니다.', 5),
    (2, '알고리즘 문제풀이', '매주 알고리즘 문제를 풀고 리뷰합니다.', 4),
    (3, '백엔드 면접 대비', 'CS와 시스템 설계 질문을 중심으로 준비합니다.', 6),
    (4, 'Docker 실습반', '컨테이너와 배포 자동화를 실습합니다.', 3),
    (5, '트랜잭션 심화', '격리 수준과 락을 사례 중심으로 분석합니다.', 4);

INSERT INTO study_members (group_id, user_id)
SELECT group_id, creator_id
FROM study_groups;

INSERT INTO study_members (group_id, user_id)
VALUES
    (1, 6),
    (1, 7),
    (2, 8),
    (3, 9),
    (3, 10),
    (5, 11);

