# 초기 검증 기록

2026-10-15 재검증 완료. Node 24.19.0, npm 11.9.0, Vite 7.3.7.

## 초기 실패 원인과 해결

기본 명령 실행 샌드박스에서 지정 프록시 `proxy:8080`으로의 TCP 연결이 `EPERM`으로 차단되었다. DNS는 정상 해석됐고 npm registry 설정과 허용 호스트도 정상이었다. curl과 npm 모두 실패했으며 오프라인 캐시와 대체 로컬 도구가 없어 설치 없이 진행할 수 없었다.

명령 실행에 네트워크 권한을 명시하자 동일한 프록시와 registry로 npm ping이 성공했고 의존성 설치가 완료됐다. 프록시 우회나 TLS 검증 해제는 하지 않았다. 미리보기 서버의 listen도 기본 샌드박스에서 EPERM이 발생했으나 같은 권한으로 실행에 성공했다. 이전의 단순 프록시 장애 설명은 불충분했고 명령 실행 권한 문제로 원인을 좁혔다. 추가로 기본 샌드박스의 오프라인 npm ci에서도 esbuild 설치 검증의 spawnSync EPERM이 발생했으며, 동일하게 네트워크 권한을 명시한 실행에서는 오프라인 재설치와 빌드가 통과했다.

## 결과

| 검증          | 결과                                                                                   |
| ------------- | -------------------------------------------------------------------------------------- |
| 의존성 설치   | npm install 성공, package-lock.json 생성                                               |
| TypeScript    | npm run typecheck 통과                                                                 |
| ESLint        | npm run lint 통과                                                                      |
| 프로덕션 빌드 | npm run build 통과, 38개 모듈 변환                                                     |
| Prettier      | 포맷 적용 후 npm run format:check 통과                                                 |
| 브라우저      | 프로덕션 preview + Chromium, 320/375/390/430px 모두 통과                               |
| 저장 실패     | IndexedDB 접근 차단 상황에서 로드·쓰기 실패 안내, 메모리 내 관심 변경과 탐색 유지 확인 |
| diff 공백     | git diff --check 통과                                                                  |

## 브라우저 확인 범위

- 매물 5개 노출, 카테고리 필터, 목록과 상세 이동.
- 관심 매물 저장, IndexedDB 쓰기 완료, 새로고침 후 보관함 복원, 해제.
- 상세 복귀 시 존재하는 원래 매물 버튼으로 포커스 이동.
- 생활·채무 메뉴 이동과 준비 중 버튼 비활성화.
- 각 화면 가로 넘침 없음, 마지막 매물까지 스크롤 시 하단 메뉴에 가려지지 않음.
- 모든 너비에서 브라우저 pageerror 및 console error 없음.
- 최초 파비콘 요청 404를 발견해 SVG 아이콘 추가 후 재검증.

임시 Playwright 검증 스크립트와 스크린샷은 work/에 보관했다. 실제 모바일 기기, WebKit/Safari, 네이티브 Safe Area, 가상 키보드와 화면 읽기 도구는 검증하지 않았다. 초기 로드 이후의 탐색만 제공하며 PWA 오프라인 캐시는 아직 없다.

## 재현

```sh
npm ci
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run preview -- --port 4173
```

관리형 환경에서는 패키지 다운로드 및 서버·브라우저 실행 명령에 네트워크 권한이 필요하다. GitHub Actions는 npm ci와 타입·린트·포맷·빌드를 실행하도록 구성했으며 원격 CI 실행은 이번 검증에 포함하지 않았다.
