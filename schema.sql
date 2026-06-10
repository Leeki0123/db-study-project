DROP TABLE IF EXISTS study_members;
DROP TABLE IF EXISTS study_groups;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE study_groups (
    group_id BIGSERIAL PRIMARY KEY,
    creator_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    max_members INTEGER NOT NULL CHECK (max_members BETWEEN 2 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE study_members (
    group_id BIGINT NOT NULL REFERENCES study_groups(group_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_study_groups_creator_id
    ON study_groups (creator_id);

CREATE INDEX idx_study_members_user_id
    ON study_members (user_id);

