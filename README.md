# db-study-project

PostgreSQL 기반의 스터디 모집 서비스 과제를 위한 프로젝트 골격이다. 사용자는 회원으로 등록하고, 스터디를 생성하거나 참여할 수 있으며, `pgbench`를 통해 `Read Committed`와 `Serializable` 격리 수준의 동시성 차이를 비교할 수 있도록 구성한다.

## 과제 요구사항 반영 범위

- 스터디 모집 서비스 시나리오를 기준으로 프로젝트를 구성했다.
- `users`, `study_groups`, `study_members` 3개 테이블 중심의 정규화된 스키마를 작성했다.
- Docker로 PostgreSQL을 실행할 수 있도록 `docker-compose.yml`을 포함했다.
- Node.js, Express, `pg` 기반의 백엔드 기본 구현을 추가했다.
- 간단한 API 테스트용 정적 프론트엔드 화면을 추가했다.
- 벤치마크 SQL과 실행 스크립트, 문서 템플릿, PPT 폴더를 함께 구성했다.

## 기술 스택

- Database: PostgreSQL 16
- Backend: Node.js, Express, `pg`, `dotenv`
- Frontend: HTML, CSS, Vanilla JavaScript
- Infra: Docker Compose
- Benchmark: `pgbench`

## DB 설계 요약

### `users`

- 사용자 기본 정보 저장
- 주요 컬럼: `user_id`, `name`, `email`, `created_at`

### `study_groups`

- 스터디 모집글 저장
- 주요 컬럼: `group_id`, `creator_id`, `title`, `description`, `max_members`, `created_at`

### `study_members`

- 사용자와 스터디의 참여 관계 저장
- 복합 기본키: `group_id`, `user_id`

## 프로젝트 구조

```text
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
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── docs/
│   ├── 01_requirements.md
│   ├── 02_schema_design.md
│   ├── 03_normalization.md
│   ├── 04_transaction_design.md
│   ├── 05_benchmark_plan.md
│   └── 06_benchmark_result.md
└── ppt/
```

## 실행 방법

### 1. 데이터베이스 실행

```bash
cp .env.example .env
docker compose up -d
```

초기 스키마와 샘플 데이터는 컨테이너 최초 실행 시 `schema.sql`, `insert_data.sql`로 자동 반영된다. DB를 완전히 초기화하려면 다음 명령을 사용한다.

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

기본 서버 주소는 `http://localhost:3000`이다.

### 3. 프론트엔드 테스트 화면 사용

`frontend/index.html`을 브라우저에서 열거나, 간단한 정적 서버로 서빙해서 사용할 수 있다. 프론트 화면에서 사용자 생성, 스터디 생성, 목록 조회, 참여/취소 요청을 테스트할 수 있다.

## API 목록

| Method | URL | 설명 |
|---|---|---|
| `GET` | `/health` | 서버/DB 연결 상태 확인 |
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

## 트랜잭션 처리 설명

스터디 참여 API는 트랜잭션으로 처리한다.

1. 트랜잭션 시작
2. 격리 수준 설정
3. 사용자/스터디 존재 여부 확인
4. 이미 참여 중인지 확인
5. 현재 참여 인원과 정원 비교
6. 참여 가능하면 `study_members`에 insert
7. 성공 시 commit, 실패 시 rollback

기본 격리 수준은 `READ COMMITTED`이며, 요청 본문에 `isolationLevel`을 넘기면 `SERIALIZABLE`도 테스트할 수 있다.

## 벤치마킹 실행 방법

```bash
./run_benchmark.sh
```

실행 결과는 `benchmark/results/<timestamp>/` 폴더에 저장된다. 기본 실행 조건은 과제 가이드 기준으로 `c = 10, 50, 100`, `j = 4, 8, 16`, `T = 60초`다.

## 벤치마킹 결과 요약

현재는 결과 템플릿만 준비되어 있다. 실제 수치와 해석은 벤치마크 실행 후 `docs/06_benchmark_result.md`와 PPT에 정리하면 된다.

## PPT 위치

발표 자료는 `ppt/` 폴더에 정리할 수 있도록 폴더와 안내 파일을 준비했다.

