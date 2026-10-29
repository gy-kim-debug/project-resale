# 아키텍처

React·TypeScript·Vite·Tailwind CSS v4·Zustand·IndexedDB(idb) 기반 클라이언트 게임이다. 서버·인증·네이티브 의존성은 없다.

## 책임

| 위치                             | 책임                                                             |
| -------------------------------- | ---------------------------------------------------------------- |
| src/domain/game.ts               | 직렬화 가능한 게임/아이템/명령/결과 타입·정수 금액/시각 표시     |
| src/content/bargaining.ts        | 일반 시장별 흥정 프로필·초기 가격·전략·판매 문의 제한            |
| src/domain/bargaining.ts         | 구매/판매 문의의 순수 상태 전이·채팅 응답                        |
| src/domain/purchaseBargaining.ts | 시장/판매 성향 결합·가격 선택지·접근 방식·UI/엔진 공통 가능 조건 |
| src/domain/engine.ts             | 순수 명령 실행·시드 난수·시간·거래·이자·이벤트·능력치            |
| src/content/market.ts            | 카테고리 기준 가치·가격 단계·매입가 범위·나눔/수집 금액          |
| src/content/rules.ts             | 행동·즉시 판매 비율·등급·콘텐츠·밸런스                           |
| src/app/store.ts                 | 명령 결과 반영, 탐색 탭, 관심 상태, 저장 직렬화·오류·복원        |
| src/storage                      | 저장 인터페이스·IndexedDB·전체 스냅샷 검증·이전 저장 보존        |
| src/App.tsx                      | 공통 3줄 헤더·홈·5개 탭·하단 창 스택·필수 문의·종료 화면         |
| src/components/GameViews.tsx     | 각 화면·입력·구매/판매 확인·결과·백업 파일 조작                  |
| src/components/Icon.tsx          | 로컬 SVG 아이콘                                                  |
| src/styles.css                   | 모바일·safe-area·고정 헤더·하단 탐색·스크롤·하단 창              |
| scripts/build-offline.mjs        | 빌드 결과 해시를 사용한 앱 파일 캐시·서비스 워커 생성            |
| tests/engine.test.ts             | 도메인 규칙·무변경 실패·장기 플레이·저장 검증                    |
| scripts/verify-screens.py        | 모바일 Chromium UI·저장/복원·오프라인·종료 검증                  |
| docs/design                      | 사용자 확정 규칙·주제별 개발자 위임 결정·UI·v1 정책              |
| work                             | 커밋 제외 번들·스냅샷·검증 스크린샷·배포 아카이브                |

## 게임 실행

`execute(game, command)`는 입력을 복제하고 새 상태·성공 여부·결과 설명을 반환한다. 실패한 행동은 원본을 반환하므로 돈·시간·인벤토리·난수가 변하지 않는다. React는 계산하지 않고 명령을 보낸다. 확률은 직렬화된 LCG 시드에서 계산하므로 같은 입력·명령은 같은 결과다. `crypto.getRandomValues`는 새 게임 시드 생성에만 사용한다.

실제 가치는 물품 생성 때 정해지고 확인 전 UI에서 숨긴다. 상태 판정은 거래 난수·가치 계산과 분리한다. 생존 수치는 사용하지 않는다. 수리·일별 시장은 명시적 도메인 규칙으로 가치를 바꾼다.

진행은 주당 20행동이다. `weekActions`는 사용 횟수, `settling`은 필수 정산 여부, `interestWeek`는 납부 완료 주 수다. `principalRepaidThisWeek`는 이번 주 원금 상환 합계이며 의무 목표에서 차감한다. 호환용 `minute`는 행동 1회당 480눈금이다. `timeMode: weekly-actions` 저장은 그대로 복원하며 `domain/time.ts`가 구 저장의 사용 행동·납부 주·금융·물품·기한·채팅·난수를 보존해 한 번 변환한다. `weeklyRulesVersion: 2`로 구 30행동 저장을 구분하고, `startSettlement`와 `payInterest`를 분리해 20회 소진이 자동 주차 이동이나 이자 납부를 일으키지 않는다. KRW는 정수 `number`다. 1,000조 원 이하를 지원한다. 소수·음수·안전 정수 초과 입력을 거부하고 비용·공간 검사를 행동 실행 전에 끝낸다. 화폐 계산은 공통 100원 단위 반올림을 적용한다. 금액 계산에 비트 연산을 쓰지 않으며 32비트 연산은 난수 시드에만 사용한다.

## 저장과 복원

저장 스키마 v2는 게임·시드·매물·보관함·문의·능력치·원금/이자·기록·사건·관심 목록을 포함한다. 성공 행동마다 독립 스냅샷을 만들어 Promise 큐로 직렬화 저장한다. StrictMode 초기 로드는 단일 Promise로 중복 실행을 방지한다. 구버전 관심 전용 저장(v1)은 `legacy-v1` 키에 보존한다.

로드·가져오기 전 배열·물품·금액·수치·상태·등록/문의 참조를 검증한다. 손상된 데이터는 자동 덮어쓰기하지 않고 메모리 상태에서 안내한다. 백업 가져오기나 명시적 새 게임으로 복구할 수 있다. 저장 실패 시 상태는 유지하고 안내하며 정상 저장 경로에서 다음 변경에 재시도한다. 서비스 워커 업데이트는 저장 큐가 끝난 뒤 적용한다. 다중 기기 자동 동기화는 없다. 네이티브 전환 시 `SaveRepository` 구현을 교체한다.

## UI와 접근성

[사용자 확정 UI](design/ui/LAYOUT.md)를 따른다. 상단은 항상 보이고 활동 하단 창은 측정된 헤더 바로 아래부터 하단 탭까지 덮는다. 상세 스택에서는 뒤로, 루트에서는 닫기를 제공한다. 창은 독립 스크롤·포커스 이동/순환·Escape·배경 inert를 사용한다. 필수 문의는 전체 라우트를 대체하고 엔진과 UI에서 다른 행동을 차단한다. 새로고침 후에도 문의 상태를 복원한다.

safe-area·100dvh·최소 44px 버튼·숫자 입력 16px·공통 스크롤 여유를 고려한다. 결과 안내는 기저 화면에서 흐름 안에 놓아 버튼을 가리지 않으며 창 안에서도 확인·닫기가 가능하다.

## 오프라인

외부 폰트·이미지·API 요청이 없다. 프로덕션 서비스 워커는 버전별로 HTML·해시 JS/CSS·파비콘을 설치 시 캐시한다. 탐색 요청은 네트워크 우선·실패 시 앱 캐시, 정적 앱 파일은 캐시 우선이다. 새 버전은 사용자 버튼으로 활성화하고 오래된 캐시를 정리한다. 최초 네트워크 접속과 캐시 성공 전에 오프라인 재실행은 보장하지 않는다. 앱을 끄거나 벽시계 시간이 지나도 게임 시간은 진행하지 않는다.

## 행동 피드백

`src/app/actionPresentation.ts`는 750ms 연출 설정·행동명·실제 수치 차이를 정의한다. Zustand의 비동기 `act`는 엔진을 한 번 실행·저장한 뒤 UI 전용 `action` 스냅샷을 보여주고, 연출 완료 시 결과 안내와 강조를 연다. 원본 `game` 스키마는 유지한다. 실패 명령은 기다리지 않고 반환하며, 연출 중 호출은 거부한다. 서비스 워커 업데이트 시 `flushSaves`는 연출과 저장 큐를 모두 기다린다.

`ActionProgress`는 입력을 가리는 레이어와 전후 날짜·행동 횟수, `ActionBudget`은 읽기 전용 날짜·행동 예산 전환을 담당한다. Header는 연출 전 수치를 보여주다가 완료 시 실제 값과 변경 강조를 표시한다. 배경 inert·키보드 포커스·동작 줄이기 환경을 고려한다. 화면의 모든 실행 경로는 같은 스토어를 사용하므로 장터 내부 탐색 액션이나 홈 대기도 동일하게 처리한다.

장터 흥정 대화는 `Item.chat`·`Inquiry.chat`의 선택 필드로 저장한다(v2 호환). `TradeChat`은 표시만 담당한다. 제안·재제안·거절·흥정 종료·파토는 순수 엔진에서 시간을 소모하지 않으며 실제 구매·판매 성사에만 행동 1회을 적용한다. Zustand는 시간이 흐르지 않은 채팅 명령을 즉시 반영·저장하고 시간 경과 레이어를 생략한다.

구매 전 상태 확인 명령을 제거했다. 과거 `inspected` 저장 필드는 필수 검증·런타임 참조에서 제외하여 기존 저장을 계속 읽되 구매 전 상태 공개에는 사용하지 않는다. 물품 상태는 소유한 뒤 UI에 공개하며, 실제 가치·숨겨진 결함은 기존 `checked`에 따른다.

`domain/inventory.ts`는 실제 매입가와 공개 가능한 현재 시장 가치·차액을 계산한다. `ItemComparison`이 목록과 상세에서 재사용한다. 매입가 선택 필드 `acquiredFor`는 구매/획득 엔진에서 기록하며 과거 v2 저장은 합의 가격/원래 구매 가격으로 읽는다.

판매 `counter` 명령은 입력 금액·문의·횟수를 검증한 뒤 순수 엔진에서 구매자 응답을 계산한다. 판매 성사는 별도 `accept` 명령이다. `endInquiry`는 해당 문의만 닫고 글·다른 문의·물품을 유지하며 `finishSale`은 실제 판매/명시적 취소 때 글과 관련 문의를 정리한다. 판매자 제안은 기존 v2 문의 금액·횟수·채팅 필드에 저장한다.

`domain/instantSale.ts`가 실제 가치의 60%를 BigInt 중간 연산과 100원 단위 반올림으로 계산한다. 즉시 판매 UI는 별도 방문이나 견적 저장 없이 이 함수를 사용한다. `outletSell`은 현재 물품 가치에서 다시 계산해 기존 견적 변조·시세 변화와 무관하게 원자적으로 판매한다. `visit`과 `quotes`는 구 버전 호환 목적으로만 남아 있으며 화면에는 여러 매각처를 노출하지 않는다.

`advance`는 주요 행동 예산과 행동별 생존 소모를 처리한다. 세 번째 행동은 `endDay`로 한 번만 정산하고 일별 시장·게시판과 거래 기한은 실제 날짜 경계를 사용한다.

기존 저장의 음식 관련 필드는 정규화 단계에서 삭제하며, 새 저장은 생존 수치를 보관하지 않는다. 구 주간 사용 행동 수를 새 20행동 예산으로 전환한다.

주간 이자는 `domain/debt.ts`의 공통 계산을 UI·납부·정규화에서 사용한다. 주간 의무 원금 또는 이자 미납은 파산 종료, 마지막 완납은 클리어다. `interestWeek`로 마지막 정산 주를 보관하고 필수 납부는 다른 명령보다 먼저 검사한다. 이율의 정수 단위와 BigInt 중간 계산으로 100원 단위 반올림을 보장한다.

물품 가격대의 설계 원본은 `docs/design/items/CATEGORIES_AND_PRICES.md`, 실행 데이터는 `content/market.ts`로 분리한다. 카테고리·등급·희귀도·상태를 적용하고 게시 가격은 1,000원 단위로 내린다. 기존 저장의 물품 가격·실제 가치는 다시 생성하지 않는다.

`check`와 `repair`는 비용·물품/능력치 변경만 처리하고 `advance`를 호출하지 않는다. 시간 0인 실제 처리의 기존 연출·직렬화 저장·중복 명령 차단은 유지한다.

시장 정의와 고유 품목·게시가 범위는 `content/markets.ts`, 정책은 `docs/design/markets/`에 둔다. `Item.marketId`와 `Sale.marketId`로 출처를 보존하고 `Game.board`는 6개 시장의 매물을 함께 저장한다. UI는 선택 시장만 필터링한다. 선택 시장은 게임 계산 밖 `SaveData.selectedMarket` 메타데이터로 저장한다. 구 물품은 시장 ID가 없으면 장터로 취급하며 소급 재생성하지 않는다. 단일 시장 탐색은 그 시장만 교체하고 날짜 경계에서는 전체를 한 번 갱신한다.

고가 경매 로직은 `domain/auction.ts`, 수치는 `content/auction.ts`로 분리한다. `Item.auction`의 상태·금액·진행 대화는 백업에서도 검증하며 입찰에는 난수나 시간이 진행하지 않는다. 실제 결제만 기존 매입 경로에서 원자적으로 처리한다.

시장 UI 경로는 `Route.marketId`로 고정한다. 활동에서 각 시장으로 직접 열고 목록/상세 왕복 시 원래 시장을 유지한다. `selectedMarket`은 마지막 방문 기록이며 명시적인 장터 경로를 덮어쓰지 않는다.

## 시장별 흥정 공통화

일반 시장은 모두 같은 `ListingView`와 `purchaseReply`를 사용한다. 시장별 가격 선택지·프로필·접근 방식은 콘텐츠 설정으로 분리한다. 구매자의 역제안·거절은 `saleReply`로 묶어 중복 분기를 제거한다. 구매와 판매는 역할/상태가 다르므로 각각의 순수 함수로 유지하며 엔진은 난수를 주입하고 결과만 적용한다. 경매 입찰·즉시 판매는 별도 거래 방식으로 유지한다.

`previousOffer`는 구 저장과 호환되는 선택 필드이며 이전 흥정의 최소 수락가·인내심·가격·제안 선택지를 재생성하지 않는다. UI와 엔진이 `canPurchaseOffer`를 함께 사용한다. [시장별 공략과 수치](design/trading/bargaining/MARKET_STRATEGIES.md)는 개발자 초기 밸런스안으로 구분한다.

의무 원금·원금 납부 후 예상 이자·총 필요 금액은 `domain/debt.ts`의 순수 함수에서 공통 계산한다. UI는 원금/이자 순서를 안내하는 납부 버튼을 표시하며 엔진도 원금 미납 시 이자 납부/주차 전환을 거절한다. 구 저장의 명시적 이번 주 상환 기록은 한 번만 복원한다.

`domain/money.ts`가 공통 100원 단위 반올림과 정수 비율 계산을 담당한다. `domain/moneyMigration.ts`는 구 저장 금액·협상·원화 대사를 변환하고 경매 위치와 자산/시간/난수를 보존한다. `moneyUnit: 100` 저장의 통화 필드는 100원 배수 정합성을 검사한다. [금액 정책](design/economy/MONEY_UNITS.md)을 따른다.

## 특별 매물·능력치·사업

`content/specialListings.ts`와 `domain/specialListings.ts`가 확률/이름/할인/소장품과 순수 변환을 분리한다. 일반 시장의 8개 매물 중 최대 1개에만 적용하고 경매·무료나눔·기존 보유품에는 소급하지 않는다. 공통 `ItemTags`로 표시한다.

능력치 정의는 `content/abilities.ts`, 레벨 계산은 `domain/abilities.ts`로 통합한다. 기존 경험 기록을 사용하며 새 매입 감각을 구매 협상 시작에 적용한다. 이미 저장된 수락가/인내심은 유지한다.

`content/businesses.ts`가 구매비와 고정 주간 수입을 정의하고 `domain/business.ts`가 수입 예상/미지급액을 계산한다. `businesses`에는 ID/구매 주차만 저장한다. `startSettlement`가 수입을 먼저 지급하고 `businessIncomeWeek`/`businessIncomeAmount`를 저장한 뒤 채무 납부 가능성을 판정한다. 중복 수금은 없다. 화면 진입·오프라인·저장 복원은 수입을 지급하지 않는다. 사업 탭/활동의 사업은 같은 `BusinessView`를 재사용한다.

사업 수량은 기존 `businesses` 배열의 개별 구매 기록으로 유지한다. `businessCount`가 종류별 수량을 세며 콘텐츠의 `BUSINESS_LIMIT_PER_TYPE`(5)을 엔진·검증·UI가 함께 사용한다. 동일 ID의 기록을 허용하되 종류별 6개 이상 및 전체 25개 초과는 백업에서 거절한다. 수입은 모든 개별 기록을 합산한다. 이전 보유 기록/정산 수령액의 스키마 전환은 필요하지 않다.

우편 기록은 Log의 선택적 category(start/market/special/activity)를 사용한다. log 기본값은 activity이며 엔진이 우편 대상에만 분류를 지정한다. notifications의 공통 필터가 목록·안 읽음·전체 읽음에 적용된다. 구 저장의 분류 없는 로그는 알려진 허용 문구로 판별하며 기존 로그·읽음 ID를 재생성하지 않는다.

판매 유동성 수치는 content/saleFlow.ts에, 등록가/현재 시장 가치로 문의 확률을 정하는 순수 함수는 domain/saleFlow.ts에 둔다. 엔진의 첫 문의 예약·재시도 간격이 같은 콘텐츠 설정을 사용한다. 확률은 매칭 조회 시에만 적용하며 무료 읽기/흥정으로 추가 추첨하지 않는다.

카테고리별 성격은 content/itemProfiles.ts가 관리하고 domain/itemProfiles.ts가 상태·희귀 배수·상태 표시를 계산한다. 엔진의 새 매물 생성/감정·수리비와 domain/saleFlow.ts의 수요가 같은 설정을 사용한다. base/value는 생성 시 저장하고 과거 보유품을 복원할 때 재평가하지 않는다. 현재 비용과 수요에는 새 설정을 사용한다.

거래 상대 명부·성향은 content/traders.ts, 구매자 첫 제안/파토 설정은 domain/traders.ts에서 관리한다. Item/Inquiry의 선택적 traderId로 고정 가상 프로필을 참조하며 기존 ID 없는 상대는 이름과 기존 흥정 동작을 유지한다. 나이·성별은 계산에 참여하지 않는다.

아이템 도감 정의는 content/collection.ts가 활성 시장·나눔/수집 품목 콘텐츠로부터 구성한다. domain/collection.ts가 획득 해금을 처리하고 Game.discoveredItems를 저장한다. 기존 저장의 보유품만 마이그레이션하며 미보유 품목의 실제 가치를 노출하지 않는다. UI는 components/TraderProfile.tsx·ItemCodex.tsx에 분리한다.

페이지 이동은 app/navigation.ts가 세션 내 History API와 React 경로를 연결한다. App의 페이지별 스크롤 맵과 app/marketUi.ts의 임시 필터 저장소로 상세 왕복 시 목록 상태를 복원한다. 하단 메뉴는 비활성 배경 콘텐츠 밖에 두어 상세 페이지에서도 사용할 수 있게 한다. 미응답 문의/필수 정산/행동 처리 중의 차단은 게임 상태를 계속 기준으로 한다. 이 UI 상태는 게임 저장/경제 난수에 포함하지 않는다.

닉네임 단어 데이터는 content/nicknames.ts, 독립 시드 생성기는 domain/nicknames.ts가 관리한다. 신규 거래 상대의 ID는 기존 프로필 ID+이름 시드로 구성하고 기존 고정 ID도 지원한다. 실제 표시 이름은 저장된 seller/name을 우선하며 성향·경제 RNG는 변경하지 않는다.

품목 정의는 content/marketProducts.ts가 240개 상품의 세부 분류·최저/최고 게시 가격을 관리하고, content/productCategories.ts가 36개 분류를 기존 경제 Kind에 연결한다. content/markets.ts는 이 데이터로 시장 범위를 계산한다. 12개 무중복 품목을 선택하며 첫 진입 매물의 최저 가격을 보장한다. 도감도 같은 품목별 범위를 사용한다.

케이스 설정은 content/itemCases.ts, 독립 추첨/품질 변환은 domain/itemCases.ts에 둔다. 새 Item의 선택적 category/caseId로 저장하고 기존 metadata 없는 데이터도 지원한다. 케이스는 새 물건 생성 시 base/value/상태/게시가에 적용하며 감정·수리·로드 때 재추첨하지 않는다. 특별 소장품은 조정된 base에서 상태 가치를 계산해 중간 반올림 오차를 피한다. 가격표 문서는 scripts/export-market-catalog.mjs로 같은 데이터에서 생성한다.

선택지형 판매자 대화는 content/tradeDialogue.ts의 주제/수치와 domain/tradeDialogue.ts의 순수 응답 함수로 분리한다. Item.dialogue의 일회성 주제/호감 및 기존 chat을 저장하고, 엔진 dialogue 명령은 경제 RNG·시간·자금을 소비하지 않는다. store는 로딩 없이 답변을 저장한다. 인물 나이/성별은 문장 표현에만 쓰며 가격·정직함 계산에는 쓰지 않는다. 호감은 최초 구매 흥정 하한에만 제한적으로 적용한다. 상세 규칙은 design/trading/bargaining/TRADE_DIALOGUE.md를 참조한다.

새 매물 가치 조정은 content/valuation.ts의 사용자 확정 수치와 domain/valuation.ts의 기준 가치 생성·보너스 상한 함수가 관리한다. Item.valuationReference는 생성 시 한 번 확정하며 감정·수리·협상·저장/복원으로 재추첨하지 않는다. 일반 생성·특별 소장품·현재 시장 가치가 같은 상한을 사용한다. 필드가 없는 과거 물품은 기존 값과 시장 계산을 유지한다. 세부 규칙과 재현 비교는 design/economy/VALUATION_BALANCE.md를 참조한다.

시작 화면은 StartMenu, 게임 세션은 GameApp으로 분리한다. store가 menu/game 화면·활성 SlotId·슬롯 목록·저장 큐를 관리하며 큐마다 대상 슬롯을 캡처한다. 저장소의 load/save/listSlots/create/remove가 IndexedDB 키를 추상화하고 legacy current 이전과 슬롯 생성의 점유 검사를 트랜잭션으로 처리한다. 각 게임의 선택적 player 프로필은 content/player.ts와 domain/player.ts에서 정의/검증하며 PixelCharacter와 ActionScene에서 공유한다. 외형은 시뮬레이션 RNG를 소비하지 않는다.

닉네임 외 입력 UI는 선택지로 구성한다. app/amountChoices.ts가 공개된 현재 가치/매입가/상환 가능액에서 후보를 생성하고 100원 단위·중복·상하한을 처리한다. AmountChoice는 후보 선택과 확정을 공유한다. MarketView는 임시 query 필드에 선택한 정확한 품목명을 보관하며 직접 검색어 입력은 제공하지 않는다. 엔진/저장 명령 형식은 변경하지 않는다.

## 시작·엔딩과 거래 장면

`Game.story`는 슬롯별 진행 중 장면·대사 위치·사건 이력을 저장한다. React의 `StoryPlayer`는 표시와 선택 명령만 담당하며, `domain/story.ts`는 조건·대사·선택지를 구성한다. `engine.execute`가 결제 전 사건으로 거래를 보류하고 최종 선택 후 기존 구매/판매 처리를 한 번 실행한다. 구매 사건의 두 번째 묶음 물건도 같은 원자적 처리에 포함된다. 읽기·건너뛰기는 경제 난수와 행동을 변경하지 않는다. 기존 저장은 선택 필드 없이도 읽으며 이어하기/가져오기에서 도입 없이 사건 상태를 추가한다. 상세 규칙은 [이벤트](design/events/TRADE_SCENES.md), [시작·엔딩](design/story/INTRO_AND_ENDINGS.md)을 따른다.
