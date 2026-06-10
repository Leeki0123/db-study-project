# 04. Transaction Design

## 대상 기능

- 스터디 참여 API `POST /groups/:id/join`

## 처리 흐름

1. 트랜잭션 시작
2. 격리 수준 설정
3. 대상 사용자와 스터디 존재 여부 확인
4. 중복 참여 여부 확인
5. 현재 참여 인원 조회
6. 정원 초과 여부 확인
7. 참여 가능 시 `study_members` insert
8. commit 또는 rollback

## 실패 케이스

- 사용자가 존재하지 않음
- 스터디가 존재하지 않음
- 이미 참여 중임
- 정원이 가득 참
- Serializable 충돌로 트랜잭션 abort

## 비교 포인트

- `Read Committed`: 기본 격리 수준, 상대적으로 높은 처리량 기대
- `Serializable`: 더 강한 정합성, 대신 충돌 시 abort 가능

