# Database Project Guide

## 1. 과제 개요

이 프로젝트는 PostgreSQL을 활용한 데이터베이스 웹 서비스 개발 과제이다.

목표는 간단한 웹 서비스 시나리오를 정하고, 정규화된 DB 스키마를 설계한 뒤, Docker와 PostgreSQL을 이용해 데이터베이스를 실행하고, CRUD가 동작하는 백엔드 중심의 풀스택 앱을 구현하는 것이다.

또한 `pgbench`를 사용하여 Read Committed와 Serializable 격리 수준에서 워크로드를 실행하고, TPS, latency, abort율을 비교한 벤치마킹 결과를 PPT에 포함한다.

---

## 2. 최종 제출물

최종 제출물은 다음과 같다.

1. 본인의 GitHub 레포지토리
2. 결과물을 설명하는 PPT
3. 서비스 주소, 선택 사항

벤치마킹 보고서는 별도 문서가 아니라 PPT 안에 포함한다.

---

## 3. 서비스 주제

서비스 주제는 **스터디 모집 서비스**로 한다.

사용자는 스터디를 생성할 수 있고, 다른 사용자는 해당 스터디에 참여할 수 있다.

### 핵심 시나리오

1. 사용자가 회원으로 등록한다.
2. 사용자가 스터디 그룹을 생성한다.
3. 다른 사용자가 스터디에 참여한다.
4. 스터디 정원이 초과되면 참여가 실패한다.
5. 여러 사용자가 동시에 참여할 때 Read Committed와 Serializable 격리 수준에 따라 결과와 성능을 비교한다.

---

## 4. 핵심 기능

백엔드에서 구현해야 할 핵심 기능은 다음과 같다.

- 사용자 생성
- 사용자 조회
- 스터디 생성
- 스터디 조회
- 스터디 수정
- 스터디 삭제
- 스터디 참여
- 스터디 참여 취소

프론트엔드는 필수 핵심이 아니므로, API를 호출할 수 있는 간단한 테스트 화면 정도로 구현한다.

---

## 5. DB 테이블 설계

테이블은 3개 내외로 구성한다.

### 5-1. users

사용자 정보를 저장한다.

예상 컬럼:

- `user_id`
- `name`
- `email`
- `created_at`

### 5-2. study_groups

스터디 정보를 저장한다.

예상 컬럼:

- `group_id`
- `creator_id`
- `title`
- `description`
- `max_members`
- `created_at`

### 5-3. study_members

사용자와 스터디의 참여 관계를 저장한다.

예상 컬럼:

- `group_id`
- `user_id`
- `joined_at`

---

## 6. 관계 설계

### 6-1. 1:N 관계

`users`와 `study_groups`는 1:N 관계이다.

한 명의 사용자는 여러 개의 스터디를 만들 수 있다.

따라서 `study_groups.creator_id`는 `users.user_id`를 참조하는 외래키이다.

### 6-2. N:M 관계

`users`와 `study_groups`는 참여 관점에서 N:M 관계이다.

한 사용자는 여러 스터디에 참여할 수 있고, 한 스터디에는 여러 사용자가 참여할 수 있다.

이 다대다 관계는 `study_members` 중간 테이블로 분리한다.

---

## 7. 정규화 설명

초기에는 사용자 정보, 스터디 정보, 참여 정보를 하나의 테이블에 저장할 수도 있다.

예를 들어 다음과 같은 하나의 테이블을 생각할 수 있다.

| user_id | user_name | group_id | group_title | creator_name | joined_at |
|---|---|---|---|---|---|

하지만 하나의 테이블에 모두 저장하면 사용자 이름, 스터디 제목, 생성자 정보 등이 반복된다.

이 경우 다음과 같은 이상 현상이 발생할 수 있다.

### 삽입 이상

아직 참여자가 없는 스터디를 만들기 어렵다.

### 갱신 이상

스터디 제목이나 사용자 이름이 변경되면 여러 행을 모두 수정해야 한다.

### 삭제 이상

마지막 참여자를 삭제했을 때 스터디 정보까지 함께 사라질 수 있다.

따라서 `users`, `study_groups`, `study_members`로 분리한다.

이 구조는 데이터 중복을 줄이고, 각 테이블이 하나의 주제만 저장하도록 하여 정규화된 구조를 갖는다.

---

## 8. 트랜잭션 적용 기능

트랜잭션은 **스터디 참여 기능**에 적용한다.

스터디에는 최대 참여 인원이 있으므로, 여러 사용자가 동시에 참여 요청을 보낼 경우 정원을 초과할 수 있다.

따라서 스터디 참여 기능은 다음 흐름으로 처리한다.

1. 트랜잭션 시작
2. 스터디 정보 조회
3. 현재 참여 인원 조회
4. 정원 초과 여부 확인
5. 이미 참여한 사용자 여부 확인
6. 참여 가능하면 `study_members`에 insert
7. 성공 시 commit
8. 실패 시 rollback

---

## 9. 비교할 격리 수준

벤치마킹에서는 다음 두 격리 수준을 비교한다.

- Read Committed
- Serializable

### Read Committed

Read Committed는 PostgreSQL의 기본 격리 수준이다.

커밋된 데이터만 읽을 수 있지만, 같은 트랜잭션 안에서도 다른 트랜잭션이 커밋한 변경 결과가 다시 보일 수 있다.

따라서 성능은 상대적으로 좋을 수 있지만, 동시성 이상 현상이 발생할 가능성이 있다.

### Serializable

Serializable은 더 강한 정합성을 보장하는 격리 수준이다.

동시에 여러 트랜잭션이 실행되더라도 결과가 순차 실행과 같도록 보장하려고 한다.

대신 충돌 상황에서 일부 트랜잭션이 abort될 수 있다.

---

## 10. 벤치마킹 도구

벤치마킹 도구는 `pgbench`를 사용한다.

측정 지표는 다음과 같다.

| 지표 | 의미 |
|---|---|
| TPS | 초당 처리한 트랜잭션 수 |
| Latency | 하나의 트랜잭션이 완료되는 데 걸린 시간 |
| Abort율 | 실패하거나 rollback된 트랜잭션 비율 |

---

## 11. 참고할 수업 예제 구조

Dweb-Incheon/Benchmark GitHub 예제 구조를 참고한다.

참고할 파일 구조:

- `docker-compose.yml`
- `schema.sql`
- `insert_data.sql`
- `run_benchmark.sh`
- `pgbench workload SQL`
- `benchmark results` 폴더

단, 예제 파일을 그대로 복사하지 않는다.

예제는 주문 서비스 구조이므로, 이 프로젝트에서는 스터디 모집 서비스에 맞게 새로 작성한다.

---

## 12. 목표 프로젝트 폴더 구조

최종 프로젝트 구조는 다음과 같이 구성한다.

```text
 db-study-project/
 ├── README.md
 ├── docker-compose.yml
 ├── schema.sql
 ├── insert_data.sql
 ├── run_benchmark.sh
 ├── benchmark/
 │   ├── join_workload.sql
 │   ├── join_workload_serializable.sql
 │   └── results/
 ├── backend/
 ├── frontend/
 ├── docs/
 │   ├── 01_requirements.md
 │   ├── 02_schema_design.md
 │   ├── 03_normalization.md
 │   ├── 04_transaction_design.md
 │   ├── 05_benchmark_plan.md
 │   └── 06_benchmark_result.md
 └── ppt/
```

---

## 13. 백엔드 기술

백엔드는 다음 기술을 사용한다.

- Node.js
- Express
- pg 라이브러리
- PostgreSQL

DB 연결 정보는 환경변수로 관리한다.

`.env` 파일은 GitHub에 올리지 않고, `.env.example` 파일만 업로드한다.

---

## 14. 백엔드 API 요구사항

필요한 API는 다음과 같다.

| Method | URL | 기능 |
|---|---|---|
| POST | `/users` | 사용자 생성 |
| GET | `/users` | 사용자 목록 조회 |
| GET | `/users/:id` | 사용자 상세 조회 |
| POST | `/groups` | 스터디 생성 |
| GET | `/groups` | 스터디 목록 조회 |
| GET | `/groups/:id` | 스터디 상세 조회 |
| PATCH | `/groups/:id` | 스터디 수정 |
| DELETE | `/groups/:id` | 스터디 삭제 |
| POST | `/groups/:id/join` | 스터디 참여 |
| DELETE | `/groups/:id/leave` | 스터디 참여 취소 |

---

## 15. pgbench 실행 조건

벤치마킹 조건은 다음을 기본으로 한다.

- PostgreSQL 계정: `dweb`
- 비밀번호: `1234`
- DB 이름: `benchmark`
- 포트: `5432`
- 동시 클라이언트 수: `10`, `50`, `100`
- worker thread 수: `4`, `8`, `16`
- 실행 시간: `60초`

예시 명령어:

```bash
PGPASSWORD=1234 pgbench -h localhost -p 5432 -U dweb -d benchmark -f benchmark/join_workload.sql -n -c 10 -j 4 -T 60
```

---

## 16. 벤치마킹 워크로드

### Read Committed 워크로드

파일명:

```text
benchmark/join_workload.sql
```

기본 흐름:

```sql
BEGIN;
-- 랜덤 사용자 선택
-- 랜덤 스터디 선택
-- 현재 참여 인원 확인
-- 정원 미만이면 study_members에 insert
COMMIT;
```

### Serializable 워크로드

파일명:

```text
benchmark/join_workload_serializable.sql
```

기본 흐름:

```sql
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- 랜덤 사용자 선택
-- 랜덤 스터디 선택
-- 현재 참여 인원 확인
-- 정원 미만이면 study_members에 insert
COMMIT;
```

---

## 17. README.md 작성 원칙

`README.md`에는 다음 내용을 포함한다.

1. 프로젝트 개요
2. 과제 요구사항 충족 여부
3. 기술 스택
4. DB 설계 요약
5. 실행 방법
6. API 목록
7. 트랜잭션 처리 설명
8. 벤치마킹 실행 방법
9. 벤치마킹 결과 요약
10. PPT 파일 위치

---

## 18. PPT 구성 방향

PPT는 다음 흐름으로 구성한다.

1. 제목
2. 프로젝트 개요
3. 서비스 시나리오
4. 요구사항 분석
5. DB 스키마 설계
6. 관계 설계
7. 정규화 설명
8. 백엔드 CRUD 구현
9. 트랜잭션 처리
10. 벤치마킹 설계
11. 벤치마킹 결과
12. 결과 분석
13. 결론

벤치마킹 보고서는 별도 문서가 아니라 PPT 안에 포함한다.

---

## 19. Codex 작업 원칙

Codex는 다음 원칙에 따라 작업한다.

1. 예제 코드를 그대로 복사하지 않는다.
2. 스터디 모집 서비스에 맞게 새로 작성한다.
3. 각 파일은 빈 파일로 만들지 않고 기본 내용을 작성한다.
4. README.md에는 실행 방법을 자세히 작성한다.
5. docs 폴더의 md 파일들은 PPT 작성에 활용할 수 있도록 작성한다.
6. `schema.sql`, `insert_data.sql`, `run_benchmark.sh`는 실제 실행 가능해야 한다.
7. 백엔드 CRUD API는 PostgreSQL과 실제로 연결되어야 한다.
8. 트랜잭션 기능은 스터디 참여 API에 적용한다.
9. 벤치마킹 결과는 `benchmark/results` 폴더에 저장한다.
10. 최종적으로 GitHub 제출과 PPT 발표에 사용할 수 있는 형태로 정리한다.

---

## 20. Codex 첫 실행 프롬프트

Codex를 처음 실행할 때는 다음 프롬프트를 사용한다.

```text
현재 폴더에는 PROJECT_GUIDE.md 파일이 있다.

먼저 PROJECT_GUIDE.md를 읽고, 그 내용을 기준으로 데이터베이스 과제 프로젝트를 구성해줘.

요구사항:
1. PROJECT_GUIDE.md의 과제 목표와 서비스 주제를 따른다.
2. Dweb-Incheon/Benchmark 예제 구조는 참고만 하고 그대로 복사하지 않는다.
3. 스터디 모집 서비스에 맞게 파일을 새로 작성한다.
4. README.md, docker-compose.yml, schema.sql, insert_data.sql, run_benchmark.sh를 만든다.
5. benchmark 폴더와 workload SQL 파일을 만든다.
6. docs 폴더에 설계 문서를 만든다.
7. backend, frontend, ppt 폴더를 만든다.
8. 빈 파일만 만들지 말고 각 파일에 기본 내용을 작성한다.

우선 전체 프로젝트 기본 구조를 생성해줘.
```
