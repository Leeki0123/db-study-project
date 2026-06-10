# 02. Schema Design

## 테이블 구성

### `users`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `user_id` | `BIGSERIAL` | 사용자 PK |
| `name` | `VARCHAR(50)` | 사용자 이름 |
| `email` | `VARCHAR(255)` | 사용자 이메일, 유니크 |
| `created_at` | `TIMESTAMPTZ` | 생성 시각 |

### `study_groups`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `group_id` | `BIGSERIAL` | 스터디 PK |
| `creator_id` | `BIGINT` | 생성자 FK |
| `title` | `VARCHAR(100)` | 스터디 제목 |
| `description` | `TEXT` | 스터디 설명 |
| `max_members` | `INTEGER` | 최대 인원 |
| `created_at` | `TIMESTAMPTZ` | 생성 시각 |

### `study_members`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `group_id` | `BIGINT` | 스터디 FK |
| `user_id` | `BIGINT` | 사용자 FK |
| `joined_at` | `TIMESTAMPTZ` | 참여 시각 |

## 관계 설계

- `users` 1 : N `study_groups`
- `users` N : M `study_groups`
- N:M 관계는 `study_members`로 분리한다.

## 무결성 제약

- `users.email` 유니크
- `study_groups.max_members`는 2 이상 100 이하
- `study_members`는 `(group_id, user_id)` 복합 PK로 중복 참여 방지

