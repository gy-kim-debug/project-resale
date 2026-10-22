/** Visible counteroffers only: hidden item value and player survival never enter bargaining. */
export function nextPurchaseOffers(
  current: number,
  previous: number,
): number[] {
  const gap = current - previous;
  return [
    ...new Set(
      [0.25, 0.5, 0.75].map(
        (share) => previous + Math.max(1, Math.floor(gap * share)),
      ),
    ),
  ].filter((price) => price > previous && price < current);
}
