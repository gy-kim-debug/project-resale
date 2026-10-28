import { categoryLabel } from '../content/productCategories';
import { useState } from 'react';
import type { Game, Kind } from '../domain/game';
import { won } from '../domain/game';
import { codexEntries, unlockedItems } from '../domain/collection';
import { marketDefinition } from '../content/markets';
import { ItemArt } from './ItemArt';

export function ItemCodex({ g }: { g: Game }) {
  const [kind, setKind] = useState<Kind | '전체'>('전체');
  const [opened, setOpened] = useState<string | null>(null);
  const unlocked = unlockedItems(g);
  const catalogue = codexEntries(g);
  const entries = catalogue.filter((e) => kind === '전체' || e.kind === kind);
  return (
    <>
      <h2>
        아이템 도감{' '}
        <span className="count">
          {unlocked.size}/{catalogue.length}
        </span>
      </h2>
      <div className="filters" aria-label="도감 종류">
        {(['전체', ...new Set(catalogue.map((e) => e.kind))] as const).map(
          (k) => (
            <button
              key={k}
              aria-pressed={kind === k}
              onClick={() => {
                setKind(k);
                setOpened(null);
              }}
            >
              {k}
            </button>
          ),
        )}
      </div>
      <p className="codex-count">
        {entries.filter((e) => unlocked.has(e.key)).length}/{entries.length}{' '}
        해금
      </p>
      <div className="codex-list">
        {entries.map((entry) =>
          unlocked.has(entry.key) ? (
            <section className="codex-entry" key={entry.key}>
              <button
                className="codex-toggle"
                aria-expanded={opened === entry.key}
                onClick={() =>
                  setOpened(opened === entry.key ? null : entry.key)
                }
              >
                <ItemArt item={entry} />
                <span>
                  <strong>{entry.title}</strong>
                  <small>{categoryLabel(entry.category ?? entry.kind)}</small>
                </span>
                <span aria-hidden="true">
                  {opened === entry.key ? '−' : '+'}
                </span>
              </button>
              {opened === entry.key && (
                <div className="codex-detail">
                  <dl>
                    <div>
                      <dt>참고 시세</dt>
                      <dd>
                        {won(entry.min)} ~ {won(entry.max)}
                      </dd>
                    </div>
                    <div>
                      <dt>출현 시장</dt>
                      <dd>
                        {entry.markets.length
                          ? entry.markets
                              .map((id) => marketDefinition(id).name)
                              .join(' · ')
                          : '나눔 · 물건 수집'}
                      </dd>
                    </div>
                    <div>
                      <dt>시장 동향</dt>
                      <dd>
                        {g.marketFactor +
                          (g.trend === entry.kind ? 20 : 0) -
                          100 >=
                        0
                          ? '+'
                          : ''}
                        {g.marketFactor +
                          (g.trend === entry.kind ? 20 : 0) -
                          100}
                        %
                      </dd>
                    </div>
                  </dl>
                  <ul>
                    {entry.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ) : (
            <div className="codex-locked" key={entry.key}>
              <span aria-hidden="true">?</span>
              <strong>미발견 품목</strong>
              <small>{categoryLabel(entry.category ?? entry.kind)}</small>
            </div>
          ),
        )}
      </div>
    </>
  );
}
