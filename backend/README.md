# Backend

Node.js, Express, PostgreSQL(`pg`) 기반의 API 서버 디렉터리다.

## 현재 포함된 내용

- 환경변수 로딩
- PostgreSQL 커넥션 풀 설정
- 사용자 CRUD 중 생성/조회 API
- 스터디 생성/조회/수정/삭제 API
- 스터디 참여/참여 취소 API
- `/health` 헬스체크

## 실행

```bash
cd backend
npm install
npm run dev
```

루트 `.env` 파일을 우선 읽도록 구성되어 있다.

