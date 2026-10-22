import type { Item } from '../domain/game';
import { KIND_TAGS, TAG_LABELS } from '../content/listingTags';
import { listingFindings } from '../domain/listingTags';

export function ItemTags({ item }: { item: Item }) {
  const tags = item.listing?.tags ?? [KIND_TAGS[item.kind]];
  return (
    <span className="item-tags" aria-label="매물 태그">
      {tags.map((tag) => (
        <span className="item-tag" key={tag}>
          #{TAG_LABELS[tag]}
        </span>
      ))}
    </span>
  );
}
export function ItemFindings({ item }: { item: Item }) {
  if (!item.checked || !item.listing) return null;
  return (
    <section className="item-findings" aria-label="가치 확인 결과">
      <h3>확인 결과</h3>
      <p>{listingFindings(item).join(' · ')}</p>
    </section>
  );
}
