/** Initial liquidity tuning: elapsed time is action ticks, never real-world time. */
export const SALE_FLOW = {
  firstInquiryDelayActions: 2,
  retryDelayActions: 2,
  listingLifetimeActions: 8,
  priceBands: [
    { maxRatio: 0.85, chance: 0.85 },
    { maxRatio: 1.1, chance: 0.6 },
    { maxRatio: 1.35, chance: 0.35 },
    { maxRatio: 1.6, chance: 0.15 },
  ],
  overpricedChance: 0.05,
} as const;
