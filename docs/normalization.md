# 정규화 설명

## 비정규화된 초기 구조

사용자, 스터디, 참여 정보를 하나의 테이블에 저장하면 다음과 같은 구조가 된다.

| user_id | user_name | group_id | group_title | creator_name | joined_at |
|---|---|---|---|---|---|

이 구조에서는 사용자 이름, 스터디 제목, 생성자 정보가 참여 행마다 반복된다.

## 이상 현상

### 삽입 이상

아직 참여자가 없는 스터디를 저장하려면 `user_id`, `user_name` 컬럼에 NULL을 넣거나 더미 행을 추가해야 한다.

### 갱신 이상

사용자 이름이나 스터디 제목이 변경되면 해당 값이 포함된 모든 행을 동시에 수정해야 한다. 일부만 수정되면 데이터 불일치가 발생한다.

### 삭제 이상

마지막 참여자를 삭제하면 그 행에 함께 저장된 스터디 정보(`group_title`, `creator_name` 등)도 사라진다.

## 정규화 결과 (3NF)

| 테이블 | 담당 데이터 |
|---|---|
| `users` | 사용자 정보 (user_id, name, email) |
| `study_groups` | 스터디 정보 (group_id, creator_id, title, max_members) |
| `study_members` | 참여 관계 (group_id, user_id, joined_at) |

각 테이블은 하나의 주제만 담당하므로 중복 없이 데이터를 관리할 수 있다. 참여자가 없는 스터디도 `study_groups`에 독립적으로 저장 가능하며, 사용자 정보 변경은 `users` 테이블 1행만 수정하면 된다.
