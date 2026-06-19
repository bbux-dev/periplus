import { useState } from 'react'
import { tripExpensesByCategory, tripExpenseTotal } from '../services/tripService'
import { EXPENSE_CATEGORIES } from '../config/expenseCategories'
import { formatUSD } from '../config/money'
import type { LifeLogEntry } from '../services/db'

interface ExpenseReportProps {
  entries: LifeLogEntry[]
}

export function ExpenseReport({ entries }: ExpenseReportProps) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  // Derive category map and grand total internally — callers pass raw entries
  const categoryMap = tripExpensesByCategory(entries)
  const grandTotal = tripExpenseTotal(entries)

  // Filter EXPENSE_CATEGORIES to those present in the map — canonical order, skip empties
  const rows = EXPENSE_CATEGORIES.filter((cat) => categoryMap.has(cat))

  // Expenses not matching any EXPENSE_CATEGORIES key land in 'Uncategorized'
  const hasUncategorized = categoryMap.has('Uncategorized')

  // WR-09: pre-compute uncategorized entries for the expand/collapse panel
  const uncatEntries = hasUncategorized
    ? entries.filter(
        (e) =>
          e.type === 'expense' &&
          (typeof e.metadata.category === 'string'
            ? e.metadata.category
            : 'Uncategorized') === 'Uncategorized',
      )
    : []

  // WR-09: expand state and control id for the Uncategorized row
  const uncatIsExpanded = expandedCats.has('Uncategorized')
  const uncatControlId = 'cat-entries-Uncategorized'

  function toggleExpand(cat: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  return (
    <section aria-label="Expense report">
      <ul className="flex flex-col gap-1">
        {rows.map((cat) => {
          const subtotal = categoryMap.get(cat)!
          const isExpanded = expandedCats.has(cat)
          // WR-08: unique id for the expanded panel so aria-controls can reference it
          const controlId = `cat-entries-${cat.replace(/\W/g, '-')}`
          const catEntries = entries.filter(
            (e) =>
              e.type === 'expense' &&
              (typeof e.metadata.category === 'string'
                ? e.metadata.category
                : 'Uncategorized') === cat,
          )
          return (
            <li key={cat}>
              {/* Category row — tap to expand */}
              <button
                type="button"
                onClick={() => toggleExpand(cat)}
                className="flex justify-between w-full py-2 text-sm"
                aria-expanded={isExpanded}
                aria-controls={controlId}
              >
                <span>{cat}</span>
                <span className="font-medium">{formatUSD(subtotal)}</span>
              </button>
              {/* Individual expense entries — only visible when expanded */}
              {isExpanded && (
                <ul id={controlId} className="pl-4 flex flex-col gap-1 mb-1">
                  {catEntries.map((e) => (
                    <li
                      key={e.id}
                      className="flex justify-between text-xs text-[var(--color-muted)]"
                    >
                      <span>
                        {typeof e.metadata.merchant === 'string'
                          ? e.metadata.merchant
                          : e.title}
                      </span>
                      <span>{formatUSD(e.amount ?? 0)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
        {/* WR-09: Uncategorized bucket — now an expandable toggle button consistent
            with the canonical category rows, so individual expenses are reachable */}
        {hasUncategorized && (
          <li key="Uncategorized">
            <button
              type="button"
              onClick={() => toggleExpand('Uncategorized')}
              className="flex justify-between w-full py-2 text-sm"
              aria-expanded={uncatIsExpanded}
              aria-controls={uncatControlId}
            >
              <span className="text-[var(--color-muted)]">Uncategorized</span>
              <span className="font-medium">
                {formatUSD(categoryMap.get('Uncategorized')!)}
              </span>
            </button>
            {uncatIsExpanded && (
              <ul id={uncatControlId} className="pl-4 flex flex-col gap-1 mb-1">
                {uncatEntries.map((e) => (
                  <li
                    key={e.id}
                    className="flex justify-between text-xs text-[var(--color-muted)]"
                  >
                    <span>
                      {typeof e.metadata.merchant === 'string'
                        ? e.metadata.merchant
                        : e.title}
                    </span>
                    <span>{formatUSD(e.amount ?? 0)}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )}
      </ul>
      {/* Grand total footer — EVERY monetary value goes through formatUSD */}
      <div className="flex justify-between pt-3 border-t border-[var(--color-border)] font-bold text-sm">
        <span>Total</span>
        <span>{formatUSD(grandTotal)}</span>
      </div>
    </section>
  )
}
