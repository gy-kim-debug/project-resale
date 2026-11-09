import { actionsLeft, ACTIONS_PER_WEEK, won, type Game } from '../domain/game';
import { Icon } from './Icon';

export function MarketStatus({ g }: { g: Game }) {
  return (
    <section className="market-status" aria-label="장터 자산 정보">
      <div className="market-status-cash">
        <span>보유 현금</span>
        <strong>{won(g.cash)}</strong>
      </div>
      <div className="market-status-actions">
        <span>남은 행동</span>
        <strong>
          <Icon name="activity" size={16} />
          <span>
            {actionsLeft(g)}
            <small> / {ACTIONS_PER_WEEK}</small>
          </span>
        </strong>
      </div>
    </section>
  );
}
