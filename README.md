# 스터디 모집 서비스

PostgreSQL 기반의 스터디 모집 서비스다.
사용자가 스터디를 생성하고 참여할 수 있으며,
동시 참여 요청에서 정원 초과와 중복 참여를 트랜잭션으로 처리한다.
`pgbench`를 통해 `Read Committed`와 `Serializable` 격리 수준의 성능 차이를 측정한다.

## 기술 스택

- **Database**: PostgreSQL 16
- **Backend**: Node.js, Express, `pg` (ESM)
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Infra**: Docker Compose

## DB 스키마

사용자, 스터디, 참여 관계를 3개 테이블로 분리한 3NF 구조다.

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

복합 PK `(group_id, user_id)` — 동일 사용자의 중복 참여를 DB 레벨에서 방지한다.

## 트랜잭션 처리

스터디 참여 (`POST /groups/:id/join`)는 다음 순서로 트랜잭션을 처리한다.

1. `BEGIN`
2. `SET TRANSACTION ISOLATION LEVEL <level>`
3. 사용자·스터디 존재 여부 확인
4. 중복 참여 여부 확인
5. 현재 참여 인원과 정원 비교
6. 조건 통과 시 `INSERT INTO study_members`
7. 성공 시 `COMMIT`, 실패 시 `ROLLBACK`

요청 본문에 `isolationLevel` 필드를 넘기면 `READ COMMITTED`(기본) 또는
`SERIALIZABLE`로 실행할 수 있다.

## 실행 방법

### 데이터베이스

```bash
cp .env.example .env
docker compose up -d
```

초기 스키마와 샘플 데이터는 컨테이너 최초 실행 시 자동 적용된다.
초기화가 필요하면 아래 명령을 실행한다.

```bash
docker compose down -v
docker compose up -d
```

### 백엔드

```bash
cd backend
npm install
npm run dev
```

기본 서버 주소: `http://localhost:3000`

### 프론트엔드

백엔드가 실행 중인 상태에서 `http://localhost:3000`으로 접속한다.
프론트엔드는 `/health`, `/users`, `/groups` 등 절대 경로로 API를 호출하므로
`frontend/index.html`을 파일로 직접 열면 동작하지 않는다.

## API

| Method | URL | 설명 |
|---|---|---|
| `GET` | `/health` | 서버·DB 연결 상태 |
| `POST` | `/users` | 사용자 생성 |
| `GET` | `/users` | 사용자 목록 |
| `GET` | `/users/:id` | 사용자 상세 |
| `POST` | `/groups` | 스터디 생성 |
| `GET` | `/groups` | 스터디 목록 |
| `GET` | `/groups/:id` | 스터디 상세 |
| `PATCH` | `/groups/:id` | 스터디 수정 |
| `DELETE` | `/groups/:id` | 스터디 삭제 |
| `POST` | `/groups/:id/join` | 스터디 참여 |
| `DELETE` | `/groups/:id/leave` | 참여 취소 |

## 벤치마킹

```bash
chmod +x run_benchmark.sh
./run_benchmark.sh
```

`pgbench`로 두 격리 수준의 TPS와 Latency를 비교한다.
조건: `c = 10, 50, 100` / `j = 4, 8, 16` / `T = 60초`
결과는 `benchmark/results/<timestamp>/`에 저장된다.

상세 결과 및 분석: [`docs/benchmark_result.md`](docs/benchmark_result.md)

## 문서

- [`docs/schema_design.md`](docs/schema_design.md) — 스키마 설계 및 트랜잭션 처리 흐름
- [`docs/normalization.md`](docs/normalization.md) — 정규화 과정 (비정규화 예시 → 이상 현상 → 3NF)
- [`docs/benchmark_result.md`](docs/benchmark_result.md) — 벤치마킹 결과 및 분석
