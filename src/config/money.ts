// src/config/money.ts

// Module-level formatter — construction is cheap; reuse is free (STACK.md §3)
const _fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Formats a number as a USD currency string.
 * Rounds at 2dp before formatting to prevent IEEE 754 display artifacts
 * (PITFALLS Pitfall 4: floating-point money).
 *
 * formatUSD(123.4)               // "$123.40"
 * formatUSD(0)                   // "$0.00"
 * formatUSD(1234.56)             // "$1,234.56"
 * formatUSD(15.299999999999999)  // "$15.30"  ← rounding guard
 */
export function formatUSD(n: number): string {
  return _fmt.format(Math.round(n * 100) / 100)
}
