import { initialPlayer as player } from '../domain/models';
import { Icon, type IconName } from './Icon';
const vitals: {
  label: string;
  value: number;
  icon: IconName;
  tone: string;
}[] = [
  {
    label: '포만감',
    value: player.hunger,
    icon: 'food',
    tone: 'amber',
  },
  {
    label: '피로도',
    value: player.fatigue,
    icon: 'moon',
    tone: 'blue',
  },
  {
    label: '체력',
    value: player.health,
    icon: 'health',
    tone: 'green',
  },
];
export function PlayerStatus() {
  return (
    <section className="survival-status" aria-label="생존 상태">
      <div className="vital-grid">
        {vitals.map(({ label, value, icon, tone }) => (
          <div className={`vital ${tone}`} key={label}>
            <div className="vital-top">
              <Icon name={icon} size={14} />
              <span>{label}</span>
              <strong className="vital-value mono">{value}</strong>
            </div>
            <meter aria-label={label} min={0} max={100} value={value} />
          </div>
        ))}
      </div>
    </section>
  );
}
