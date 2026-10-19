# 초기 검증 기록

2026-10-15 작업 환경 기준.

| 검증 | 결과 |
| --- | --- |
| 저장소 확인 | origin: gy-kim-debug/project-resale, work 브랜치, 기존 파일·커밋 없음 |
| 의존성 설치 | 실패: 지정 프록시 proxy:8080 연결 불가. 오프라인 캐시도 없음 |
| TypeScript | 실행 시도, tsc 미설치로 실행 불가 |
| ESLint | 실행 시도, eslint 미설치로 실행 불가 |
| 프로덕션 빌드 | 실행 시도, 선행 tsc 미설치로 실행 불가 |
| Prettier | 실행 시도, prettier 미설치로 실행 불가 |
| 모바일 브라우저 | 앱 빌드·실행 불가로 실제 렌더링과 상호작용 검증 미수행 |
| diff 공백 검사 | git diff --cached --check 통과 |

코드 수준에서 모바일 뷰포트, safe-area, 44px 이상 터치 타깃, 가변 폭 상태 표시, 가로 스크롤 카테고리, 하단 메뉴 공간을 확인했다. 실제 모바일 화면 대응 통과를 의미하지 않는다.

## 연결 복구 후 필수 확인
1. npm install → npm run format → npm run typecheck → npm run lint → npm run build.
2. 생성된 package-lock.json을 커밋하고 CI의 npm install을 npm ci로 변경.
3. npm run dev로 320/375/390/430px 화면에서 가로 넘침·메뉴 가림 확인.
4. 카테고리별 매물 필터, 상세 진입·뒤로가기·포커스 복귀 확인.
5. 관심 저장·해제 후 새로고침 복원, IndexedDB 접근 실패 시 안내 확인.
6. 보관함·생활·채무 메뉴, 비활성 거래 버튼, 콘솔 오류 확인.

GitHub Actions에 타입 검사·린트·빌드 워크플로를 추가했으나 원격 푸시나 CI 실행은 하지 않았다. 프록시 장애로 원격 조회 역시 불가능했다. 의존성 버전 호환성은 설치 후 검증이 필요하다.
