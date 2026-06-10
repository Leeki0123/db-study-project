# 스터디 모집 서비스

PostgreSQL 기반의 스터디 모집 서비스이다.
사용자가 스터디를 생성하고 참여할 수 있으며,
`pgbench`를 활용해 `Read Committed`와 `Serializable` 격리 수준의 동시성 성능을 비교한다.

## 과제 요구사항 충족 여부

| 항목 | 내용 | 충족 |
|---|---|---|
| 서비스 시나리오 | 스터디 모집 서비스 (생성·참여·정원 관리) | ✅ |
| 정규화된 DB 스키마 | `users`, `study_groups`, `study_members` 3개 테이블, 3NF | ✅ |
| Docker + PostgreSQL | `docker-compose.yml`로 PostgreSQL 16 실행, 자동 초기화 | ✅ |
| CRUD API | 사용자·스터디·참여 관련 REST API 10개 | ✅ |
| 트랜잭션 처리 | 스터디 참여 API에 트랜잭션 적용, 격리 수준 동적 선택 | ✅ |
| 벤치마킹 | `pgbench`로 RC·Serializable 비교 (c=10/50/100, j=4/8/16, T=60s) | ✅ |
| 벤치마킹 결과 | `docs/benchmark_result.md` 및 PPT에 수치·분석 포함 | ✅ |
| GitHub 레포 | 전체 코드 및 문서 공개 | ✅ |

## 기술 스택

- **Database**: PostgreSQL 16
- **Backend**: Node.js, Express, `pg`, `dotenv` (ESM)
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Infra**: Docker Compose
- **Benchmark**: `pgbench`

## DB 설계 요약

### `users`

사용자 기본 정보 저장.
주요 컬럼: `user_id` (PK), `name`, `email` (UNIQUE), `created_at`

### `study_groups`

스터디 모집글 저장.
주요 컬럼: `group_id` (PK), `creator_id` (FK), `title`, `max_members` (CHECK 2~100), `created_at`

### `study_members`

사용자와 스터디의 참여 관계 저장.
복합 PK `(group_id, user_id)`로 중복 참여 방지.

## 프로젝트 구조

```
db-study-project/
├── README.md
├── docker-compose.yml
├── schema.sql
├── insert_data.sql
├── run_benchmark.sh
├── .env.example
├── benchmark/
│   ├── join_workload.sql
│   ├── join_workload_serializable.sql
│   └── results/
├── backend/
│   ├── package.json
│   └── src/
│       ├── server.js
│       ├── app.js
│       ├── config/
│       ├── routes/
│       └── services/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── docs/
│   ├── schema_design.md
│   ├── normalization.md
│   └── benchmark_result.md
└── ppt/
    └── 스터디_모집_서비스_DB과제.pptx
```

## 실행 방법

### 1. 데이터베이스 실행

```bash
cp .env.example .env
docker compose up -d
```

초기 스키마와 샘플 데이터는 컨테이너 최초 실행 시 자동 반영된다.
초기화가 필요하면 아래 명령을 실행한다.

```bash
docker compose down -v
docker compose up -d
```

### 2. 백엔드 실행

```bash
cd backend
npm install
npm run dev
```

기본 서버 주소: `http://localhost:3000`

### 3. 프론트엔드 사용

`frontend/index.html`을 브라우저에서 열거나
백엔드 서버에서 직접 서빙(`http://localhost:3000`)한다.

## API 목록

| Method | URL | 설명 |
|---|---|---|
| `GET` | `/health` | 서버·DB 연결 상태 확인 |
| `POST` | `/users` | 사용자 생성 |
| `GET` | `/users` | 사용자 목록 조회 |
| `GET` | `/users/:id` | 사용자 상세 조회 |
| `POST` | `/groups` | 스터디 생성 |
| `GET` | `/groups` | 스터디 목록 조회 |
| `GET` | `/groups/:id` | 스터디 상세 조회 |
| `PATCH` | `/groups/:id` | 스터디 수정 |
| `DELETE` | `/groups/:id` | 스터디 삭제 |
| `POST` | `/groups/:id/join` | 스터디 참여 |
| `DELETE` | `/groups/:id/leave` | 스터디 참여 취소 |

## 트랜잭션 처리

스터디 참여 API(`POST /groups/:id/join`)는 트랜잭션으로 처리한다.

1. 트랜잭션 시작
2. 격리 수준 설정 (`READ COMMITTED` 기본, `isolationLevel` 요청 파라미터로 변경 가능)
3. 사용자·스터디 존재 여부 확인
4. 중복 참여 여부 확인
5. 현재 참여 인원과 정원 비교
6. 참여 가능하면 `study_members`에 INSERT
7. 성공 시 COMMIT, 실패 시 ROLLBACK

## 벤치마킹 실행

```bash
chmod +x run_benchmark.sh
./run_benchmark.sh
```

실행 결과는 `benchmark/results/<timestamp>/` 폴더에 저장된다.
기본 조건: `c = 10, 50, 100` / `j = 4, 8, 16` / `T = 60초`

## 벤치마킹 결과 요약

| Isolation Level | Clients | 최고 TPS | avg Latency (c=100) | Abort율 |
|---|---|---|---|---|
| Read Committed | 10 | 5,910 | — | 0% |
| Read Committed | 50 | 7,942 | — | 0% |
| Read Committed | 100 | 7,891 | ~13ms | 0% |
| Serializable | 10 | 4,231 | — | 0% |
| Serializable | 50 | 5,685 | — | 0% |
| Serializable | 100 | 5,530 | ~18ms | 0% |

RC 대비 Serializable TPS 약 28~30% 낮음.
상세 분석은 [`docs/benchmark_result.md`](docs/benchmark_result.md) 참고.

### Abort율 0%에 대하여

두 격리 수준 모두 Abort율이 0%로 측정된 이유는 워크로드 SQL 설계 방식 때문이다.

- **조건부 INSERT**: `WHERE cm.member_count < tg.max_members AND NOT EXISTS (...)` 조건으로 정원 초과와 중복 참여를 사전에 걸러낸다.
- **`ON CONFLICT DO NOTHING`**: 경쟁 조건에서 복합 PK 충돌이 발생하더라도 에러 없이 무시(skip)된다.

이 두 장치 덕분에 pgbench 관점에서 트랜잭션 실패가 기록되지 않는다.
Serializable이라도 충돌이 에러로 노출되지 않아 Abort율 수치 차이는 나타나지 않지만,
SSI 처리 오버헤드로 인한 TPS 감소(약 28~30%)는 측정된다.

## 발표 자료

`ppt/스터디_모집_서비스_DB과제.pptx`
