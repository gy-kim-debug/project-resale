# 게임 설계 문서 — 사용자 결정과 구현 정책

이 디렉터리는 사용자가 직접 결정한 게임 규칙과 이후 전면 위임에 따라 개발자가 보완한 구현 정책을 구분해 주제별로 보관한다. 기존 단일 설계서의 28개 항목을 각각의 문서로 옮긴 뒤, 후속 사용자 결정도 관련 주제 문서에 계속 기록한다.

## 작성 원칙

- 사용자가 직접 선택한 내용과 선택 근거는 원문으로 유지한다. 이후 위임받아 개발자가 정한 내용은 별도의 v1 적용 정책으로 구분해 기록한다.
- 각 문서의 확정 내용·선택 근거·미정 사항을 함께 유지한다.
- 후속 결정은 해당 주제 문서를 수정한다. 새 주제는 관련 디렉터리에 문서를 추가하고 이 목차에 연결한다.
- 다른 주제의 규칙은 복사해 재작성하기보다 해당 문서로 링크한다.
- 이전 초안과 목업 화면의 값은 자동으로 이어받지 않는다. [이전 초안](../GAME_DESIGN_REFERENCE.md)은 참고용이다.
- 현재는 실제 플레이 가능한 v1 구현 단계다. 이전 문서의 미정 항목은 각 문서 하단의 v1 적용 정책으로 보완했다.

## 현재 구현 원칙

- [사용자 확정 UI 구성](ui/LAYOUT.md)
- [개발자 위임 결정 — 플레이 가능 v1 전체 정책](implementation/V1_RULES.md)
- [후속 설계·조정 과제](OPEN_QUESTIONS.md)

## 문서 목차

### 기본 진행

- [게임 시작 상황](core/STARTING_STATE.md)
- [게임 진행의 공통 원칙](core/TIME_AND_PROGRESS.md)

### 캐릭터

- [능력치 도입 계획](character/ABILITIES.md)

### 채무·자본금

- [주간 이자 상승과 미납 종료](debt/INTEREST_AND_BANKRUPTCY.md)

### 수익 경로

- [첫 돈을 마련하는 방법](income/INCOME_METHODS.md)

### 아르바이트

- [아르바이트 보상 방식](income/part-time/REWARDS.md)
- [아르바이트 선택 방식](income/part-time/JOB_SELECTION.md)
- [아르바이트 반복 조건](income/part-time/REPETITION.md)

### 무료 나눔

- [무료 나눔 수령과 게시글 등장](income/giveaways/LISTINGS_AND_COLLECTION.md)

### 물건 수집

- [물건 수집 결과](income/scavenging/FINDS.md)

### 보관함

- [보유 물품 수량 제한](inventory/CAPACITY.md)
- [필요 없는 물건 버리기](inventory/DISPOSAL.md)
- [구매한 자산 검증 — 행동 소모 없음](inventory/VERIFICATION.md)

### 물품·가격대

- [매물 카테고리·종류·가격대](items/CATEGORIES_AND_PRICES.md)
- [매물 해시태그 — 사실 확률과 거래 효과](items/LISTING_TAGS.md)

### 여러 시장

- [시장별 가격대·품목·공통 규칙](markets/OVERVIEW.md)
- [장터](markets/STREET.md) · [컴퓨터시장](markets/COMPUTERS.md) · [악기시장](markets/INSTRUMENTS.md)
- [중고차시장](markets/CARS.md) · [부동산 시장](markets/PROPERTY.md)

- [고가 경매시장 — 입찰·낙찰·결제](markets/AUCTION.md)
- [이전 후보 비교](markets/NEXT_MARKET_CANDIDATES.md)

### 장터 구매

- [구매 가격 협상](trading/purchasing/NEGOTIATION.md)
- [구매 합의 후 거래 완료](trading/purchasing/TRANSACTION.md)
- [구매 전후 숨겨진 결함 확인](trading/purchasing/DEFECT_DISCOVERY.md)
- [구매 전후 물건 가치 정보](trading/purchasing/VALUE_INFORMATION.md)
- [물건 구매 시 운반비](trading/purchasing/TRANSPORT_COST.md)

### 판매 경로

- [물건 판매 경로](trading/SALES_CHANNELS.md)
- [판매 경로 전환](trading/CHANNEL_SWITCHING.md)

### 즉시 판매

- [실제 가치 60% 즉시 판매](trading/INSTANT_SALE.md)

이전 매각처 정책은 폐기된 기록으로 보관한다.

- [매각처별 취급 물품과 가격](trading/outlets/ITEMS_AND_PRICES.md)
- [매각 가격 확인 방식](trading/outlets/PRICE_CHECKS.md)
- [매각처 제시 가격으로 판매](trading/outlets/FIXED_PRICE_SALES.md)

### 장터 판매·네고

- [장터 판매 가격 설정과 수정 제한](trading/marketplace/LISTING_PRICE.md)
- [판매 글 등록 한도와 확장](trading/marketplace/LISTING_LIMITS.md)
- [복수 구매 문의와 필수 응답](trading/marketplace/INQUIRIES.md)
- [판매 가격과 구매 문의의 관계](trading/marketplace/PRICE_AND_DEMAND.md)
- [장터 판매 성사 방식](trading/marketplace/SALE_ACCEPTANCE.md)
- [구매 문의의 제안 가격](trading/marketplace/BUYER_OFFERS.md)
- [판매 네고 진행 방식](trading/marketplace/NEGOTIATION.md)
- [판매 글 만료와 파토 후 처리](trading/marketplace/LISTING_LIFECYCLE.md)
- [가격 합의 후 실제 거래](trading/marketplace/TRANSACTION.md)

## 미정 사항

각 항목의 미정 규칙은 해당 문서에 적혀 있다. 전체 검토 범위는 [미정 사항](OPEN_QUESTIONS.md)에서 확인한다.

- [보관함 매입가·현재 가치 비교](inventory/VALUE_COMPARISON.md)

사용자 후속 결정: 포만감·식사 개념을 제거했다. `food/`와 `SATIETY_*` 파일은 폐기 표시만 남기고 현재 규칙 목차에서 제외한다.

체력·피로도·수면·치료도 폐기했다. `survival/`과 `sleep/`는 이전 기획의 폐기 표시이며 현재 규칙이 아니다.

### 시장별 흥정

- [시장별 공략·공통 처리·조정 가능한 밸런스](trading/bargaining/MARKET_STRATEGIES.md)
