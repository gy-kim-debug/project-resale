# 게임 설계 문서 — 사용자 결정 기록

이 디렉터리는 사용자가 직접 결정한 게임 규칙을 주제별로 보관한다. 기존 단일 설계서의 28개 항목을 각각의 문서로 옮긴 뒤, 후속 사용자 결정도 관련 주제 문서에 계속 기록한다.

## 작성 원칙

- 개발 파트너는 주제별 후보와 차이를 한 번에 여러 항목씩 제시하고, 사용자가 선택하거나 직접 지정한 내용만 해당 문서에 기록한다.
- 각 문서의 확정 내용·선택 근거·미정 사항을 함께 유지한다.
- 후속 결정은 해당 주제 문서를 수정한다. 새 주제는 관련 디렉터리에 문서를 추가하고 이 목차에 연결한다.
- 다른 주제의 규칙은 복사해 재작성하기보다 해당 문서로 링크한다.
- 이전 초안과 목업 화면의 값은 자동으로 이어받지 않는다. [이전 초안](../GAME_DESIGN_REFERENCE.md)은 참고용이다.
- 현재는 기획 문서를 작성하는 단계이며 게임 구현은 별도 작업이다.

## 문서 목차

### 기본 진행

- [게임 시작 상황](core/STARTING_STATE.md)
- [게임 진행의 공통 원칙](core/TIME_AND_PROGRESS.md)

### 캐릭터

- [능력치 도입 계획](character/ABILITIES.md)

### 생존 지표

- [체력과 포만감의 역할](survival/STAT_ROLES.md)
- [포만감 수치의 표시 방향](survival/SATIETY_DISPLAY.md)
- [포만감 부족 시 행동 처리](survival/ACTION_RESTRICTIONS.md)
- [지표가 0일 때의 처리](survival/ZERO_STAT_OUTCOMES.md)
- [포만감 소모 방식](survival/SATIETY_CONSUMPTION.md)
- [체력 회복 방법](survival/HEALTH_RECOVERY.md)
- [피로도 소모 방식](survival/FATIGUE_CONSUMPTION.md)

### 식사

- [무료 급식](food/FREE_MEALS.md)
- [무료 급식의 체력 회복 효과](food/FREE_MEAL_HEALTH_RECOVERY.md)

### 수면

- [피로도 0으로 다음 날 아침이 되었을 때의 회복](sleep/NEXT_MORNING_RECOVERY.md)
- [수면 중 포만감 감소](sleep/SATIETY_LOSS.md)
- [직접 수면 선택](sleep/VOLUNTARY_SLEEP.md)
- [수면 비용](sleep/COST.md)

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

### 판매 경로

- [물건 판매 경로](trading/SALES_CHANNELS.md)
- [판매 경로 전환](trading/CHANNEL_SWITCHING.md)

### 고물상·상점 등 매각처

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
