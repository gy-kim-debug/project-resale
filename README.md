# 다시, 장터 — 중고거래로 100억 갚기

모바일 우선 텍스트 경제·생존 게임의 초기 기반입니다. 실제 거래 엔진 없이 고정 목업 매물을 탐색합니다.

## 실행

Node.js 22.12 이상(개발 환경: 24), npm을 사용합니다.

```sh
npm ci
npm run dev
```

커밋된 lockfile을 기준으로 로컬과 CI 모두 `npm ci`를 사용합니다.

```sh
npm run typecheck
npm run lint
npm run build
npm run format:check
npm run preview
```

활동 / 내 정보 / 보관함 / 상점 / 채무의 5개 탭을 제공합니다. 활동에서 골목장터와 식사·수면·숙박 화면에 들어갑니다. 장터 카테고리·상세 탐색과 관심 매물 저장을 확인할 수 있습니다. 상점 품목과 이용 방식은 미정입니다. 관심 매물만 IndexedDB에 저장됩니다. 거래·생존 행동·상환 버튼은 준비 상태로 비활성화되어 있습니다.

## 문서

현재는 신규 화면 개발을 멈추고 상세 게임 규칙을 정리하는 단계입니다. 아래 기준서에서 확정·미정·제안을 구분해 순서대로 결정합니다.

- [게임 상세 설계 기준서 — 논의 시작점](docs/GAME_DESIGN.md)

- [게임 콘셉트](docs/GAME_CONCEPT.md)
- [시스템·미확정 규칙](docs/GAME_SYSTEMS.md)
- [아키텍처](docs/ARCHITECTURE.md)
- [로드맵](docs/ROADMAP.md)

모바일 확인 권장: 320/375/390/430px에서 가로 넘침, 하단 메뉴 가림, 상세 복귀, 키보드 탐색, 관심 매물 새로고침 복원. 실제 기기의 safe-area·가상 키보드도 출시 전 확인합니다.

## 검증 결과

TypeScript·ESLint·Prettier·프로덕션 빌드를 통과했습니다. Chromium의 320/375/390/430px에서 필터·상세·관심 저장/복원·하단 메뉴와 가로 넘침을 확인했습니다. IndexedDB 접근 실패 시 안내와 탐색 유지도 확인했습니다. [검증 기록](docs/VALIDATION.md)에 원인 분석과 범위를 정리했습니다. 실제 iOS/Android 기기 확인은 후속 과제입니다.
