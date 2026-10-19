import { initialPlayer as player } from '../domain/models';
import { Icon, type IconName } from './Icon';
const vitals: {
  label: string;
  value: number;
  icon: IconName;
  tone: string;
  caption: string;
}[] = [
  {
    label: '배고픔',
    value: player.hunger,
    icon: 'food',
    tone: 'amber',
    caption: '허기가 느껴진다',
  },
  {
    label: '피로',
    value: player.fatigue,
    icon: 'moon',
    tone: 'blue',
    caption: '아직 움직일 수 있다',
  },
  {
    label: '건강',
    value: player.health,
    icon: 'health',
    tone: 'green',
    caption: '몸은 버텨주고 있다',
  },
];
export function PlayerStatus() {
  return (
    <section className="survival-status" aria-label="플레이어 상태">
      <div className="section-label">
        <span>생존 상태</span>
        <span className="mono">CONDITION / 01</span>
      </div>
      <div className="vital-grid">
        {vitals.map(({ label, value, icon, tone, caption }) => (
          <div className={`vital ${tone}`} key={label}>
            <div className="vital-top">
              <Icon name={icon} size={18} />
              <span>{label}</span>
            </div>
            <div className="vital-value mono">
              {value}
              <small>/100</small>
            </div>
            <meter aria-label={label} min={0} max={100} value={value} />
            <p>{caption}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
