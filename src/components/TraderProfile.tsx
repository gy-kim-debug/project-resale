import { displayTrader, TRADER_STYLES } from '../content/traders';

export function TraderProfile({
  traderId,
  entityId,
  name,
  role,
}: {
  traderId?: string;
  entityId: string;
  name: string;
  role: '판매자' | '구매자' | '출품자';
}) {
  const trader = displayTrader(traderId, entityId, name);
  return (
    <section className="trader-profile" aria-label={`${role} 프로필`}>
      <div className="trader-avatar" aria-hidden="true">
        {trader.name.slice(0, 1)}
      </div>
      <div className="trader-identity">
        <strong>{trader.name}</strong>
        <span>@{trader.id}</span>
        <span>
          {trader.age}세 ·{' '}
          {trader.gender === '비공개' ? '성별 비공개' : trader.gender}
        </span>
      </div>
      <span className="trader-style">
        {traderId ? TRADER_STYLES[trader.style].label : '성향 미확인'}
      </span>
    </section>
  );
}
