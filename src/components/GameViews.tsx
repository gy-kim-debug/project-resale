import { useState, type ReactNode } from 'react';
import { useGameStore } from '../app/store';
import type { Game, Item, Command, Kind } from '../domain/game';
import { won, dayOf, timeOf } from '../domain/game';
import {
  level,
  listingLimit,
  marketValue,
  checkCost,
  repairCost,
  tier,
} from '../domain/engine';
import { FOODS, JOBS, OUTLETS, RULES, TIERS } from '../content/rules';

export type Route = {
  kind:
    | '장터'
    | '무료나눔'
    | '아르바이트'
    | '물건 수집'
    | '매각처'
    | '식사'
    | '수면'
    | '치료'
    | '매물'
    | '물품'
    | '판매 등록'
    | '문의'
    | '특별 제안'
    | '안내'
    | '기록'
    | '저장 관리';
  id?: string;
};
export type Open = (r: Route) => void;
export function Button({
  children,
  onClick,
  disabled = false,
  danger = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      className={`action-button${danger ? ' danger' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function Details({ children }: { children: ReactNode }) {
  return <div className="details">{children}</div>;
}
export function AmountForm({
  title,
  label,
  initial = '',
  max,
  submit,
}: {
  title: string;
  label: string;
  initial?: string;
  max: number;
  submit: (n: number) => void;
}) {
  const [amount, setAmount] = useState(initial);
  const valid =
    /^\d+$/.test(amount) &&
    Number.isSafeInteger(Number(amount)) &&
    Number(amount) >= 1 &&
    Number(amount) <= max;
  return (
    <form
      className="amount-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) submit(Number(amount));
      }}
    >
      <label>
        {label}
        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="원 단위 숫자"
          required
          pattern="[0-9]+"
          maxLength={16}
        />
      </label>
      <p>
        {amount && Number.isSafeInteger(Number(amount))
          ? won(Number(amount))
          : '정수 금액을 입력하세요.'}
      </p>
      <button className="action-button primary" type="submit" disabled={!valid}>
        {title}
      </button>
    </form>
  );
}
export function ItemRow({
  item,
  detail,
  onClick,
}: {
  item: Item;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button className="item-row" onClick={onClick}>
      <span>
        <strong>{item.title}</strong>
        <small>
          {item.kind} · {detail}
        </small>
      </span>
      <span aria-hidden="true">›</span>
    </button>
  );
}
export function InfoView({ g }: { g: Game }) {
  return (
    <>
      <h1>내 정보</h1>
      <p className="lead">경험은 이번 생의 능력이 됩니다.</p>
      <div className="abilities">
        {(
          [
            {
              stat: 'sales',
              name: '거래 감각',
              effect: `동시 판매 글 ${listingLimit(g)}개`,
              each: 5,
            },
            {
              stat: 'checks',
              name: '감정 지식',
              effect: `가치 확인비 ${level(g, 'checks') * 5}% 절감`,
              each: 4,
            },
            {
              stat: 'repairs',
              name: '수리 기술',
              effect: `수리 성공률 ${Math.min(95, 70 + level(g, 'repairs') * 5)}%`,
              each: 4,
            },
          ] as const
        ).map((a) => (
          <section className="card" key={a.stat}>
            <h2>
              {a.name} <span>Lv.{level(g, a.stat)}</span>
            </h2>
            <p>{a.effect}</p>
            <progress
              value={level(g, a.stat) >= 10 ? a.each : g.stats[a.stat] % a.each}
              max={a.each}
            />
            <small>
              경험 {g.stats[a.stat]} · {a.each}회마다 성장 · 최대 Lv.10
            </small>
          </section>
        ))}
      </div>
      <p className="footnote">
        생존 수치는 물건의 실제 가치나 거래 확률에 영향을 주지 않습니다.
      </p>
    </>
  );
}
export function InventoryView({ g, open }: { g: Game; open: Open }) {
  return (
    <>
      <h1>
        보관함{' '}
        <span className="count">
          {g.inventory.length}/{RULES.capacity}
        </span>
      </h1>
      <p className="lead">판매 등록 중인 물품도 보관 공간을 사용합니다.</p>
      {g.inventory.length ? (
        g.inventory.map((i) => (
          <ItemRow
            key={i.id}
            item={i}
            detail={
              g.sales.some((s) => s.itemId === i.id)
                ? '판매 등록 중'
                : i.checked
                  ? `확인 가치 ${won(i.value)}`
                  : '가치 미확인'
            }
            onClick={() => open({ kind: '물품', id: i.id })}
          />
        ))
      ) : (
        <div className="empty">
          <h2>아직 보유한 물품이 없습니다.</h2>
          <p>활동에서 무료나눔이나 물건 수집으로 시작하세요.</p>
        </div>
      )}
    </>
  );
}
export function DebtView({
  g,
  act,
}: {
  g: Game;
  act: (c: Command) => boolean;
}) {
  return (
    <>
      <h1>채무</h1>
      <div className="card debt">
        <small>남은 총 채무</small>
        <strong>{won(g.principal + g.interest)}</strong>
      </div>
      <dl>
        <div>
          <dt>원금</dt>
          <dd>{won(g.principal)}</dd>
        </div>
        <div>
          <dt>발생 이자</dt>
          <dd>{won(g.interest)}</dd>
        </div>
        <div>
          <dt>누적 상환</dt>
          <dd>{won(g.stats.repaid)}</dd>
        </div>
        <div>
          <dt>보유 현금</dt>
          <dd>{won(g.cash)}</dd>
        </div>
      </dl>
      <p className="lead">
        처음 3일 무이자. 4일째부터 자정마다 남은 원금의 일 0.0001%가 발생합니다.
        1원 미만은 올림하며, 이자에 이자는 붙지 않습니다.
      </p>
      <p>상환은 이자부터 차감합니다. 5분 소모.</p>
      <AmountForm
        title="입력 금액 상환"
        label="상환 금액"
        max={Math.min(g.cash, g.principal + g.interest)}
        submit={(amount) => act({ type: 'repay', amount })}
      />
      <Button
        disabled={!g.cash || (!g.principal && !g.interest)}
        onClick={() =>
          act({
            type: 'repay',
            amount: Math.min(g.cash, g.principal + g.interest),
          })
        }
      >
        가능한 만큼 상환 · {won(Math.min(g.cash, g.principal + g.interest))}
      </Button>
    </>
  );
}
export function ShopView({
  g,
  act,
}: {
  g: Game;
  act: (c: Command) => boolean;
}) {
  return (
    <>
      <h1>상점</h1>
      <p className="lead">
        음식은 구매 즉시 먹습니다. 물품 매각은 활동의 매각처에서 진행하세요.
      </p>
      {FOODS.filter((f) => f.cost > 0).map((f) => (
        <section className="card" key={f.id}>
          <h2>{f.title}</h2>
          <p>
            {won(f.cost)} · {f.minutes}분
          </p>
          <p>
            포만감 +{f.satiety} · 체력 +{f.health}
          </p>
          <Button
            disabled={g.cash < f.cost}
            onClick={() => act({ type: 'meal', id: f.id })}
          >
            구매하고 먹기
          </Button>
        </section>
      ))}
    </>
  );
}
export function MarketView({
  g,
  open,
  free = false,
}: {
  g: Game;
  open: Open;
  free?: boolean;
}) {
  const [category, setCategory] = useState<Kind | '전체'>('전체');
  const act = useGameStore((s) => s.act);
  const favorites = useGameStore((s) => s.favoriteIds);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const listings = g.board.filter(
    (i) =>
      (free ? i.price === 0 : i.price > 0) &&
      (category === '전체' || i.kind === category) &&
      (!onlyFavorites || favorites.includes(i.id)),
  );
  return (
    <>
      <p className="lead">
        {free
          ? '나눔 글은 랜덤하게 올라옵니다. 현금이 없어도 글이 없을 수 있습니다.'
          : `${TIERS[tier(g)].name} 거래가 열려 있습니다. 판매자 가격만 표시하며 실제 가치는 숨겨져 있습니다.`}
      </p>
      <p className="market-trend">
        오늘의 시장: {g.trend} 수요 ↑ · 전반 {g.marketFactor >= 100 ? '+' : ''}
        {g.marketFactor - 100}%
      </p>
      {!free && (
        <>
          <div className="filters" aria-label="카테고리">
            {(['전체', '생활', '디지털', '가구', '수집품'] as const).map(
              (c) => (
                <button
                  key={c}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ),
            )}
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={onlyFavorites}
              onChange={(e) => setOnlyFavorites(e.target.checked)}
            />
            관심 매물만 보기
          </label>
        </>
      )}
      <Button onClick={() => act({ type: 'refresh' })}>
        새 매물 탐색 · 30분
      </Button>
      {listings.length ? (
        listings.map((i) => (
          <ItemRow
            key={i.id}
            item={i}
            detail={free ? '무료나눔' : won(i.price)}
            onClick={() => open({ kind: '매물', id: i.id })}
          />
        ))
      ) : (
        <div className="empty">
          <h2>
            {free ? '현재 무료나눔 글이 없습니다.' : '표시할 매물이 없습니다.'}
          </h2>
          <p>
            {free
              ? '아르바이트·물건 수집을 하거나 시간을 써서 새 매물을 찾아보세요.'
              : '다른 카테고리나 새 매물을 확인하세요.'}
          </p>
        </div>
      )}
    </>
  );
}
export function ListingView({
  g,
  item,
  act,
}: {
  g: Game;
  item: Item;
  act: (c: Command) => boolean;
}) {
  const favorites = useGameStore((s) => s.favoriteIds);
  const toggle = useGameStore((s) => s.toggleFavorite);
  const [confirm, setConfirm] = useState(false);
  const price = item.negotiatedPrice ?? item.price;
  return (
    <>
      <h2>{item.title}</h2>
      <p className="item-price">
        {item.price === 0 ? '무료나눔' : won(item.price)}
      </p>
      <p>
        {item.kind} · 판매자 {item.seller}
      </p>
      <p className="lead">{item.description}</p>
      <Details>
        <p>실제 가치: 구매 후 별도 확인</p>
        <p>
          {item.inspected
            ? `직접 확인한 상태: ${item.condition}. 가품·숨겨진 결함은 아직 알 수 없습니다.`
            : '판매자 설명만으로 상태를 보증할 수 없습니다.'}
        </p>
        <p>매물 유효 시간: {Math.max(0, item.expires - g.minute)}분 남음</p>
      </Details>
      <Button onClick={() => toggle(item.id)}>
        {favorites.includes(item.id) ? '관심 해제' : '관심 저장'}
      </Button>
      <Button
        disabled={item.inspected}
        onClick={() => act({ type: 'inspect', id: item.id })}
      >
        {item.inspected
          ? '구매 전 상태 확인 완료'
          : `구매 전 외관·작동 확인 · 15분${item.kind === '디지털' ? ' · 200원' : ' · 현금 소모 없음'}`}
      </Button>
      {item.price > 0 && item.negotiation === 'none' && (
        <section className="card">
          <h3>구매 가격 제안 · 각 15분</h3>
          <p>
            판매자가 거절할 수 있습니다. 한 매물에 한 번만 제안할 수 있습니다.
          </p>
          {item.offers.map((p) => (
            <Button
              key={p}
              onClick={() => act({ type: 'offer', id: item.id, price: p })}
            >
              {won(p)} 제안
            </Button>
          ))}
        </section>
      )}
      {item.negotiation !== 'none' && (
        <p className="lead">
          {item.negotiation === 'accepted'
            ? `협상 수락 · 합의 금액 ${won(price)}`
            : '협상 거절 · 원래 가격으로 구매 가능'}
        </p>
      )}
      {!confirm ? (
        <Button
          disabled={g.cash < price || g.inventory.length >= RULES.capacity}
          onClick={() => setConfirm(true)}
        >
          {item.price === 0 ? '나눔 수령 확인' : '구매 내용 확인'} ·{' '}
          {won(price)}
        </Button>
      ) : (
        <section className="card">
          <h3>지불·수령 확인</h3>
          <p>
            {won(price)} · 15분 · 포만감 추가 1 · 피로도 추가 1. 운반비는
            없습니다.
          </p>
          <Button
            disabled={g.cash < price || g.inventory.length >= RULES.capacity}
            onClick={() => act({ type: 'buy', id: item.id })}
          >
            {item.price === 0 ? '나눔 수령 확정' : '지불·수령 확정'}
          </Button>
          <Button onClick={() => setConfirm(false)}>구매하지 않기</Button>
        </section>
      )}
      {g.cash < price && <p className="warning">현금이 부족합니다.</p>}
      {g.inventory.length >= RULES.capacity && (
        <p className="warning">보관함이 가득 찼습니다.</p>
      )}
    </>
  );
}
export function OwnedView({
  g,
  item,
  act,
  open,
}: {
  g: Game;
  item: Item;
  act: (c: Command) => boolean;
  open: Open;
}) {
  const sale = g.sales.find((s) => s.itemId === item.id);
  const [discard, setDiscard] = useState(false);
  return (
    <>
      <h2>{item.title}</h2>
      <p>
        {item.kind} · {sale ? '판매 등록 중' : '보관 중'}
      </p>
      <Details>
        {item.checked ? (
          <>
            <p>실제 가치 {won(item.value)}</p>
            <p>현재 시장 기준 {won(marketValue(g, item))}</p>
            <p>
              상태: {item.condition} · {item.defect}
            </p>
          </>
        ) : (
          <p>실제 가치·숨겨진 결함은 아직 알 수 없습니다.</p>
        )}
      </Details>
      {!item.checked && (
        <Button
          disabled={g.cash < checkCost(g, item)}
          onClick={() => act({ type: 'check', id: item.id })}
        >
          가치 확인 · 15분 · {won(checkCost(g, item))}
        </Button>
      )}
      {item.checked && item.condition !== '양호' && !item.repaired && (
        <section className="card">
          <h3>수리</h3>
          <p>
            비용 {won(repairCost(item))} · 60분 · 성공률{' '}
            {Math.min(95, 70 + level(g, 'repairs') * 5)}%. 실패해도 비용은
            사용됩니다. 재수리 불가.
          </p>
          <Button
            disabled={!!sale || g.cash < repairCost(item)}
            onClick={() => act({ type: 'repair', id: item.id })}
          >
            수리하기
          </Button>
        </section>
      )}
      {sale ? (
        <section className="card">
          <h3>판매 글 등록 중</h3>
          <p>
            {won(sale.price)} · 만료까지 {Math.max(0, sale.expires - g.minute)}
            분
          </p>
          <p>
            등록 중 가격 수정 불가. 취소 후 새 가격으로 재등록할 수 있습니다.
          </p>
          <Button onClick={() => act({ type: 'wait' })}>
            구매 문의 기다리기 · 30분
          </Button>
          <Button onClick={() => act({ type: 'cancel', id: item.id })}>
            판매 등록 취소 · 5분
          </Button>
        </section>
      ) : (
        <Button onClick={() => open({ kind: '판매 등록', id: item.id })}>
          장터에 판매 등록
        </Button>
      )}
      <Button onClick={() => open({ kind: '매각처' })}>매각처 방문</Button>
      {sale && (
        <p className="footnote">
          매각·수리·버리기 전에 판매 등록을 취소하세요.
        </p>
      )}
      {!discard ? (
        <Button danger disabled={!!sale} onClick={() => setDiscard(true)}>
          물품 버리기
        </Button>
      ) : (
        <section className="card">
          <p>복구할 수 없습니다. 시간·현금·상태 소모는 없습니다.</p>
          <Button danger onClick={() => act({ type: 'discard', id: item.id })}>
            버리기 확정
          </Button>
          <Button onClick={() => setDiscard(false)}>계속 보관</Button>
        </section>
      )}
    </>
  );
}
export function OutletView({
  g,
  act,
}: {
  g: Game;
  act: (c: Command) => boolean;
}) {
  const outlet = OUTLETS.find((o) => o.id === g.quotes?.outlet);
  const [selected, setSelected] = useState<string | null>(null);
  const item = g.inventory.find((i) => i.id === selected);
  const quote = item && g.quotes?.prices[item.id];
  return (
    <>
      <p className="lead">
        방문해야 가격을 알 수 있습니다. 매각처는 협상 없이 제시 가격으로만
        매입합니다.
      </p>
      {OUTLETS.map((o) => (
        <Button
          key={o.id}
          onClick={() => {
            setSelected(null);
            act({ type: 'visit', id: o.id });
          }}
        >
          {o.title} 방문 · 30분
        </Button>
      ))}
      {g.quotes && outlet && (
        <section className="card">
          <h2>{outlet.title} 제시 가격</h2>
          <p>{120 - (g.minute - g.quotes.at)}분 유효 · 판매 15분</p>
          {g.inventory.length ? (
            g.inventory.map((i) => (
              <button
                className="item-row"
                key={i.id}
                disabled={
                  !g.quotes?.prices[i.id] ||
                  g.sales.some((s) => s.itemId === i.id)
                }
                onClick={() => setSelected(i.id)}
              >
                <span>
                  <strong>{i.title}</strong>
                  <small>
                    {g.sales.some((s) => s.itemId === i.id)
                      ? '장터 등록 취소 필요'
                      : g.quotes?.prices[i.id]
                        ? won(g.quotes.prices[i.id])
                        : '취급하지 않는 품목'}
                  </small>
                </span>
              </button>
            ))
          ) : (
            <p>보유한 물품이 없습니다.</p>
          )}
        </section>
      )}
      {item && quote && (
        <section className="card">
          <h3>매각 확인</h3>
          <p>
            {item.title} · {won(quote)}
          </p>
          <Button
            onClick={() => {
              act({ type: 'outletSell', id: item.id });
              setSelected(null);
            }}
          >
            제시 가격으로 판매 확정
          </Button>
          <Button onClick={() => setSelected(null)}>보관하기</Button>
        </section>
      )}
    </>
  );
}
export function InquiriesView({
  g,
  act,
}: {
  g: Game;
  act: (c: Command) => boolean;
}) {
  return (
    <>
      <p className="warning">
        문의에 응답해야 다음 행동으로 넘어갈 수 있습니다. 제안을 비교해
        결정하세요.
      </p>
      {g.inquiries.map((q) => {
        const sale = g.sales.find((s) => s.id === q.saleId);
        const item = g.inventory.find((i) => i.id === sale?.itemId);
        return (
          <section className="card" key={q.id}>
            <h2>{q.name}</h2>
            <p>
              {item?.title} · 등록 {won(sale?.price ?? 0)}
            </p>
            <p className="item-price">제안 {won(q.price)}</p>
            <p>{q.rounds ? '거절 후 재제안' : '새로운 구매 문의'}</p>
            <Button onClick={() => act({ type: 'accept', id: q.id })}>
              수락 · 판매 완료 (15분)
            </Button>
            <Button onClick={() => act({ type: 'reject', id: q.id })}>
              거절 · 재제안 또는 파토 (5분)
            </Button>
          </section>
        );
      })}
      <Button
        danger
        onClick={() => act({ type: 'break', id: g.inquiries[0].id })}
      >
        거래 파토 · 판매 글과 전체 문의 종료 (5분)
      </Button>
    </>
  );
}
export function StorageView() {
  const s = useGameStore();
  const [confirm, setConfirm] = useState(false);
  function download() {
    if (!s.game) return;
    const blob = new Blob(
      [
        JSON.stringify(
          { version: 2, game: s.game, favoriteIds: s.favoriteIds },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-day-${dayOf(s.game)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <p className="lead">
        매 행동과 관심 매물 변경 후 이 브라우저에 자동 저장합니다. 앱을 꺼도
        시간은 흐르지 않습니다. 다른 폰으로 옮기려면 백업을 사용하세요.
      </p>
      <Button onClick={download}>백업 파일 내보내기</Button>
      <label className="file-input">
        백업 가져오기 (현재 진행 교체)
        <input
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 2_000_000) {
              useGameStore.setState({
                notice: '2MB 이하 JSON 파일만 가져올 수 있습니다.',
                ok: false,
              });
              return;
            }
            try {
              const raw = await file.text();
              if (window.confirm('현재 진행을 이 백업으로 교체할까요?'))
                s.importSave(raw);
            } catch {
              useGameStore.setState({
                notice: '백업 파일을 읽지 못했습니다.',
                ok: false,
              });
            }
            e.target.value = '';
          }}
        />
      </label>
      <p className="footnote">
        잘못된 백업은 거부하며 현재 진행을 유지합니다. 시크릿 모드·사이트 데이터
        삭제·브라우저 변경 시 저장이 사라질 수 있으니 백업을 권장합니다.
      </p>
      <Button onClick={() => s.save()}>저장 다시 시도</Button>
      {!confirm ? (
        <Button danger onClick={() => setConfirm(true)}>
          현재 진행을 버리고 새 게임
        </Button>
      ) : (
        <section className="card">
          <p>
            기존 진행은 삭제됩니다. 계승·부활 없이 현금 0원부터 새로 시작합니다.
            먼저 백업을 내려받을 수 있습니다.
          </p>
          <Button
            danger
            onClick={() => {
              s.startOver();
              setConfirm(false);
            }}
          >
            새 게임 시작 확정
          </Button>
          <Button onClick={() => setConfirm(false)}>취소</Button>
        </section>
      )}
    </>
  );
}
export function RouteView({
  route,
  g,
  open,
  act,
}: {
  route: Route;
  g: Game;
  open: Open;
  act: (c: Command) => boolean;
}) {
  const item = g.inventory.find((i) => i.id === route.id);
  const listing = g.board.find((i) => i.id === route.id);
  switch (route.kind) {
    case '장터':
      return <MarketView g={g} open={open} />;
    case '무료나눔':
      return <MarketView g={g} open={open} free />;
    case '매물':
      return listing ? (
        <ListingView g={g} item={listing} act={act} />
      ) : (
        <div className="empty">
          <h2>매물이 종료됐습니다.</h2>
          <p>수령한 물품은 보관함에서 확인할 수 있습니다.</p>
          <Button
            onClick={() => {
              const received = g.inventory.find((i) => i.id === route.id);
              if (received) open({ kind: '물품', id: received.id });
            }}
          >
            받은 물품 확인
          </Button>
        </div>
      );
    case '물품':
      return item ? (
        <OwnedView g={g} item={item} act={act} open={open} />
      ) : (
        <div className="empty">
          <h2>보관 중인 물품이 아닙니다.</h2>
          <p>물품을 판매하거나 처분했습니다.</p>
        </div>
      );
    case '판매 등록':
      return item ? (
        g.sales.some((s) => s.itemId === item.id) ? (
          <>
            <p className="success">
              판매 글이 등록됐습니다. 등록 중 가격을 바꿀 수 없습니다.
            </p>
            <Button onClick={() => open({ kind: '물품', id: item.id })}>
              등록한 물품 확인
            </Button>
            <Button onClick={() => act({ type: 'wait' })}>
              구매 문의 기다리기 · 30분
            </Button>
          </>
        ) : (
          <>
            <h2>{item.title}</h2>
            <p className="lead">
              등록 15분 · 무료 · 48시간 유효. 등록 중 가격 수정은 불가능합니다.{' '}
              {g.sales.length}/{listingLimit(g)}개 등록 중.
            </p>
            <p>
              원하는 가격을 입력하세요. 높을수록 문의가 줄고, 실제 가치보다 높은
              제안은 드뭅니다.
            </p>
            {item.checked && <p>현재 시장 기준 {won(marketValue(g, item))}</p>}
            <AmountForm
              title="판매 글 등록 확정"
              label="판매 가격 (원)"
              max={RULES.maxMoney}
              submit={(price) => act({ type: 'post', id: item.id, price })}
            />
            {g.sales.some((s) => s.itemId === item.id) && (
              <p className="success">판매 글이 등록됐습니다.</p>
            )}
          </>
        )
      ) : (
        <p>보유하지 않은 물품입니다.</p>
      );
    case '아르바이트':
      return (
        <>
          <p className="lead">
            고정 보상을 받고 시간을 씁니다. 상태가 허용하면 반복해서 선택할 수
            있습니다. 표시된 추가 소모 외에 시간 경과 소모도 적용됩니다.
          </p>
          {JOBS.map((j) => (
            <section key={j.id} className="card">
              <h2>{j.title}</h2>
              <p>
                {j.minutes}분 · 보상 {won(j.reward)}
              </p>
              <p>
                포만감 추가 -{j.satiety} · 피로도 추가 -{j.fatigue}
              </p>
              <Button
                disabled={g.satiety === 0}
                onClick={() => act({ type: 'job', id: j.id })}
              >
                일하기
              </Button>
            </section>
          ))}
        </>
      );
    case '물건 수집':
      return (
        <>
          <p className="lead">
            항상 물건을 발견하지만 대부분 저렴합니다. 종류·상태·가치는 다릅니다.
            60분 · 포만감 추가 5 · 피로도 추가 5.
          </p>
          <p>
            보관함 {g.inventory.length}/{RULES.capacity}
          </p>
          <Button
            disabled={g.inventory.length >= RULES.capacity || g.satiety === 0}
            onClick={() => act({ type: 'scavenge' })}
          >
            물건 수집하기
          </Button>
        </>
      );
    case '식사':
      return (
        <>
          <p className="lead">
            포만감 0에서도 식사는 가능합니다. 무료 급식은 언제나 이용할 수 있고
            반복하면 가득 채울 수 있습니다.
          </p>
          {FOODS.map((f) => (
            <section key={f.id} className="card">
              <h2>{f.title}</h2>
              <p>
                {won(f.cost)} · {f.minutes}분 · 포만감 +{f.satiety} · 체력 +
                {f.health}
              </p>
              <Button
                disabled={g.cash < f.cost}
                onClick={() => act({ type: 'meal', id: f.id })}
              >
                먹기
              </Button>
            </section>
          ))}
        </>
      );
    case '수면':
      return (
        <>
          <p className="lead">
            무료 · 다음 날 09:00. 피로도는 100으로 회복, 체력은 유지, 포만감은
            18 감소합니다. 자정 이자 정산과 매물 갱신도 진행됩니다.
          </p>
          <p>
            포만감 0에서도 수면할 수 있습니다. 잠으로 체력은 회복되지 않습니다.
          </p>
          <Button onClick={() => act({ type: 'sleep' })}>
            잠자고 다음 날로
          </Button>
        </>
      );
    case '치료':
      return (
        <>
          <p className="lead">
            동네 의원 · {won(10_000)} · 60분 · 체력 +60. 포만감 0에서도 치료할
            수 있습니다.
          </p>
          <Button
            disabled={g.cash < 10_000}
            onClick={() => act({ type: 'treat' })}
          >
            치료받기
          </Button>
        </>
      );
    case '매각처':
      return <OutletView g={g} act={act} />;
    case '문의':
      return g.inquiries.length ? (
        <InquiriesView g={g} act={act} />
      ) : (
        <p>남은 문의가 없습니다.</p>
      );
    case '특별 제안':
      return g.event ? (
        <>
          <h2>{g.event.title}</h2>
          <p className="lead">{g.event.text}</p>
          <p>남은 시간 {g.event.expires - g.minute}분</p>
          <Button onClick={() => act({ type: 'event', choice: 'yes' })}>
            제안 수락
          </Button>
          <Button onClick={() => act({ type: 'event', choice: 'no' })}>
            거절 (5분)
          </Button>
        </>
      ) : (
        <p>현재 특별 제안이 없습니다.</p>
      );
    case '기록':
      return (
        <ol className="journal">
          {g.logs.map((l) => (
            <li key={l.id}>
              <small>
                {Math.floor(l.minute / 1440) + 1}일{' '}
                {timeOf({ ...g, minute: l.minute })}
              </small>
              <p>{l.text}</p>
            </li>
          ))}
        </ol>
      );
    case '저장 관리':
      return <StorageView />;
    case '안내':
      return (
        <>
          <h2>현금 0원에서 시작하기</h2>
          <p className="lead">
            아르바이트로 현금을 만들거나, 무료나눔·물건 수집으로 물품을
            얻으세요. 매각처는 빠르지만 낮은 가격에 매입합니다. 장터는 원하는
            가격으로 등록하고 시간을 보내 문의를 받습니다.
          </p>
          <h2>생존</h2>
          <p>
            포만감 0이면 포만감 소모 행동은 불가능합니다. 무료 급식은 항상
            가능합니다. 시간당 포만감 3·피로도 4가 줄고, 활동별 추가 소모가
            있습니다. 활동 중 포만감이 바닥나면 체력이 줄며, 체력 0은
            사망입니다. 피로도 0은 다음 날 아침으로 넘어갑니다.
          </p>
          <h2>거래 위험</h2>
          <p>
            구매 전에는 판매 가격만 알 수 있습니다. 확인으로 일부 결함을 찾을 수
            있지만 가품·실제 가치는 구매 후 별도 가치 확인이 필요합니다. 수리는
            실패할 수 있습니다. 생존 수치는 물품 가치·거래 확률을 바꾸지
            않습니다.
          </p>
          <h2>성장과 목표</h2>
          <p>
            현금 최고 기록이 오르면 더 큰 거래가 열립니다. 물품 가치를 확인하고
            적절한 가격에 재판매해 100억 원과 이자를 갚으세요. 내 정보에서는
            능력치만 확인할 수 있습니다.
          </p>
          <h2>저장</h2>
          <p>
            매 행동 후 자동 저장합니다. 앱을 꺼도 시간은 흐르지 않습니다. 다른
            기기에서는 저장 관리의 백업 파일을 가져오세요.
          </p>
        </>
      );
  }
}
