# 벤치마킹 결과

## 실행 환경

- 실행 일시: 2026-06-10
- pgbench 18.3 (Homebrew) / PostgreSQL 16.13 (Docker)
- 실행 시간: 60초 / 케이스별
- 데이터: users 10,000명, study_groups 100개

## Abort율 0%에 대하여

두 격리 수준 모두 Abort율이 0%로 측정됐다.
이는 워크로드 SQL의 설계 방식 때문이다.

**원인 1 — 조건부 INSERT**

```sql
WHERE cm.member_count < tg.max_members
  AND NOT EXISTS (
      SELECT 1 FROM study_members sm
      WHERE sm.group_id = :group_id AND sm.user_id = :user_id
  )
```

정원 초과와 중복 참여를 INSERT 실행 전에 걸러낸다.
조건이 거짓이면 INSERT 자체가 실행되지 않으므로 트랜잭션은 항상 성공한다.

**원인 2 — `ON CONFLICT DO NOTHING`**

경쟁 조건에서 복합 PK `(group_id, user_id)` 충돌이 발생하더라도
에러가 아닌 무시(skip)로 처리된다.
pgbench 입장에서 이 트랜잭션은 실패가 아니다.

이 두 장치 덕분에 Serializable 격리 수준에서도 Abort율 수치 차이가 나타나지 않는다.
그러나 Serializable의 SSI(Serializable Snapshot Isolation) 처리 오버헤드는
TPS 감소(약 28~30%)로 확인된다.

## 전체 결과

### Read Committed

| Clients | Workers | TPS | Avg Latency (ms) | Abort율 |
|---|---|---|---|---|
| 10 | 4 | 5,910.30 | 1.692 | 0.000% |
| 10 | 8 | 5,572.00 | 1.795 | 0.000% |
| 10 | 16 | 5,551.15 | 1.801 | 0.000% |
| 50 | 4 | 7,570.91 | 6.604 | 0.000% |
| 50 | 8 | 7,941.83 | 6.296 | 0.000% |
| 50 | 16 | 7,380.79 | 6.774 | 0.000% |
| 100 | 4 | 6,689.25 | 14.949 | 0.000% |
| 100 | 8 | 7,793.74 | 12.831 | 0.000% |
| 100 | 16 | 7,891.02 | 12.673 | 0.000% |

### Serializable

| Clients | Workers | TPS | Avg Latency (ms) | Abort율 |
|---|---|---|---|---|
| 10 | 4 | 4,231.07 | 2.363 | 0.000% |
| 10 | 8 | 3,888.68 | 2.572 | 0.000% |
| 10 | 16 | 4,141.60 | 2.415 | 0.000% |
| 50 | 4 | 5,215.25 | 9.587 | 0.000% |
| 50 | 8 | 5,684.65 | 8.796 | 0.000% |
| 50 | 16 | 5,500.14 | 9.091 | 0.000% |
| 100 | 4 | 5,529.59 | 18.085 | 0.000% |
| 100 | 8 | 5,407.31 | 18.493 | 0.000% |
| 100 | 16 | 5,322.83 | 18.787 | 0.000% |

## TPS 비교 요약

| Clients | RC 최고 TPS | SER 최고 TPS | TPS 차이 (RC 대비) |
|---|---|---|---|
| 10 | 5,910 | 4,231 | -28.4% |
| 50 | 7,942 | 5,685 | -28.4% |
| 100 | 7,891 | 5,530 | -29.9% |

## 관찰 내용

- **TPS**: Read Committed가 Serializable 대비 일관되게 약 28~30% 높다.
- **Latency**: 클라이언트 수 100 기준으로 RC는 12~15ms, Serializable은 18ms 수준이다.
- **Worker 수 영향**: 클라이언트 10에서는 worker 수를 늘려도 TPS 향상이 없다.
  클라이언트 50~100에서는 worker 8 전후에서 TPS가 가장 높다.
- **Abort율**: 위 섹션에서 설명한 이유로 양쪽 모두 0%이다.

## 해석

Read Committed는 각 쿼리 실행 시점의 커밋된 데이터를 읽으며
충돌 감지 오버헤드가 없어 처리량이 높다.

Serializable은 SSI 방식으로 트랜잭션 간 의존 관계를 추적하는
추가 작업이 발생해 TPS가 낮고 Latency가 높다.

## 결론

- `ON CONFLICT DO NOTHING`은 복합 PK `(group_id, user_id)` 충돌만 방지한다.
  정원 조건(`member_count < max_members`)을 직렬화하지는 않으므로,
  Read Committed에서는 두 트랜잭션이 동시에 정원 여유를 확인하고 모두 삽입하면 정원 초과가 발생할 수 있다.
- Serializable은 SSI를 통해 이 경쟁 조건(Write Skew / Phantom)을 감지하고 한 쪽을 Abort시켜 정원 초과를 방지한다.
- 순수 TPS 측면에서 Read Committed가 약 28~30% 높다.
- 실제 API(`groupService.js`)에서는 `SELECT ... FOR UPDATE`로 스터디 행에 잠금을 걸어
  두 격리 수준 모두 정원 초과를 방지한다. 벤치마크 워크로드는 잠금 없는 단일 SQL로 구성해
  격리 수준 간 SSI 오버헤드 차이를 측정하는 데 집중했다.
