# 05. Benchmark Plan

## 목표

스터디 참여 트랜잭션을 대상으로 격리 수준에 따른 처리량과 실패율 차이를 측정한다.

## 도구

- `pgbench`

## 측정 지표

| 지표 | 의미 |
|---|---|
| TPS | 초당 처리한 트랜잭션 수 |
| Latency | 트랜잭션 완료 시간 |
| Abort율 | 실패 또는 rollback 비율 |

## 기본 실행 조건

- DB 계정: `dweb`
- DB 비밀번호: `1234`
- DB 이름: `benchmark`
- 포트: `5432`
- 동시 클라이언트 수: `10`, `50`, `100`
- Worker 수: `4`, `8`, `16`
- 실행 시간: `60초`

## 결과 저장 위치

- `benchmark/results/<timestamp>/`

## 분석 방향

- 같은 클라이언트 수에서 TPS 차이 비교
- worker 수 변화에 따른 latency 차이 확인
- Serializable에서 abort 증가 여부 확인

