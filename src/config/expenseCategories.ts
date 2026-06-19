// src/config/expenseCategories.ts
// Single source of truth for expense categories — imported by ExpenseSheet (Plan 22-02)
// and Phase 24's category-grouped report. No React / component imports — keep it import-light.

/**
 * Ordered list of expense categories for the trip expense flow.
 * Order is locked: Hotel, Rental Car, Flight, Taxi/Uber, Food, Gas, Parking, Other.
 * Phase 24's category-grouped report imports this same constant to guarantee consistent ordering.
 */
export const EXPENSE_CATEGORIES = [
  'Hotel',
  'Rental Car',
  'Flight',
  'Taxi/Uber',
  'Food',
  'Gas',
  'Parking',
  'Other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]
