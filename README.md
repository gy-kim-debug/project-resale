# 다시, 장터 — 중고거래로 100억 갚기

모바일 우선 텍스트 경제·생존 게임의 초기 기반입니다. 실제 거래 엔진 없이 고정 목업 매물을 탐색합니다.

## 실행
Node.js 22.12 이상(개발 환경: 24), npm을 사용합니다.

```sh
npm install
npm run dev
```

최초 lockfile 생성 후 CI에서는 `npm ci`를 사용합니다.

```sh
npm run typecheck
npm run lint
npm run build
npm run format:check
npm run preview
```

게시판 카테고리와 상세 탐색, 관심 매물 저장, 보관함·생활·채무 메뉴를 확인할 수 있습니다. 관심 매물만 IndexedDB에 저장됩니다. 거래·생존 행동·상환 버튼은 준비 상태로 비활성화되어 있습니다.

## 문서
- [게임 콘셉트](docs/GAME_CONCEPT.md)
- [시스템·미확정 규칙](docs/GAME_SYSTEMS.md)
- [아키텍처](docs/ARCHITECTURE.md)
- [로드맵](docs/ROADMAP.md)

모바일 확인 권장: 320/375/390/430px에서 가로 넘침, 하단 메뉴 가림, 상세 복귀, 키보드 탐색, 관심 매물 새로고침 복원. 실제 기기의 safe-area·가상 키보드도 출시 전 확인합니다.

## 현재 검증 제한
초기 작업 환경에서 지정 네트워크 프록시 연결이 실패해 의존성을 설치하지 못했습니다. 따라서 타입 검사·린트·빌드·브라우저 실행은 아직 검증되지 않았습니다. [검증 기록과 후속 절차](docs/VALIDATION.md)를 확인해 주세요. GitHub Actions 검증 워크플로도 포함되어 있습니다.
