# 스키마 설계

## 테이블 구성

### `users`

| 컬럼 | 타입 | 제약 |
|---|---|---|
| `user_id` | `BIGSERIAL` | PK |
| `name` | `VARCHAR(50)` | NOT NULL |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() |

### `study_groups`

| 컬럼 | 타입 | 제약 |
|---|---|---|
| `group_id` | `BIGSERIAL` | PK |
| `creator_id` | `BIGINT` | NOT NULL, FK → users |
| `title` | `VARCHAR(100)` | NOT NULL |
| `description` | `TEXT` | DEFAULT '' |
| `max_members` | `INTEGER` | NOT NULL, CHECK (2~100) |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() |

### `study_members`

| 컬럼 | 타입 | 제약 |
|---|---|---|
| `group_id` | `BIGINT` | NOT NULL, FK → study_groups |
| `user_id` | `BIGINT` | NOT NULL, FK → users |
| `joined_at` | `TIMESTAMPTZ` | DEFAULT NOW() |

복합 PK: `(group_id, user_id)`

## 관계 설계

- `users` 1 : N `study_groups` — 한 사용자가 여러 스터디를 생성할 수 있다. `study_groups.creator_id`가 `users.user_id`를 참조한다.
- `users` N : M `study_groups` — 참여 관점에서 다대다 관계이다. `study_members` 중간 테이블로 분리했다.

## 무결성 제약

- `users.email` UNIQUE — 이메일 중복 방지
- `study_groups.max_members` CHECK (2~100) — 비현실적인 정원 방지
- `study_members (group_id, user_id)` 복합 PK — 동일 사용자의 중복 참여 방지
- `study_groups.creator_id` ON DELETE RESTRICT — 참여자가 있는 스터디의 생성자 삭제 방지
- `study_members.group_id/user_id` ON DELETE CASCADE — 스터디나 사용자 삭제 시 참여 기록 자동 정리

## 인덱스

- `idx_study_groups_creator_id` — 사용자별 스터디 목록 조회 최적화
- `idx_study_members_user_id` — 사용자별 참여 스터디 조회 최적화

## 트랜잭션 처리 — `POST /groups/:id/join`

스터디 참여는 다음 흐름으로 트랜잭션 처리한다.

1. `BEGIN`
2. `SET TRANSACTION ISOLATION LEVEL <level>`
3. 사용자·스터디 존재 여부 확인
4. 중복 참여 여부 확인 (`409` 반환)
5. 현재 참여 인원 조회
6. 정원 초과 여부 확인 (`409` 반환)
7. `INSERT INTO study_members`
8. `COMMIT` / 실패 시 `ROLLBACK`

요청 본문에 `isolationLevel` 필드를 넘기면 `READ COMMITTED`(기본) 또는 `SERIALIZABLE`로 실행할 수 있다. Serializable 충돌(`40001`) 발생 시 `409`로 응답한다.
