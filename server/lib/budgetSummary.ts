// Budget math for the MCP get_trip_budget tool. Kept dependency-free so it
// can be unit-tested in the main CI suite.

export type CostRow = {
  cost: number | null;
  currency: string | null;
  amount_paid?: number | null;
};

export type CategorySummary = {
  total: number;
  paid: number;
  currencies: string[];
  items: number;
};

export function summarizeCosts(rows: CostRow[] | null): CategorySummary {
  const total = (rows ?? []).reduce((sum, r) => sum + (r.cost ?? 0), 0);
  const paid = (rows ?? []).reduce((sum, r) => sum + (r.amount_paid ?? 0), 0);
  const currencies = [
    ...new Set((rows ?? []).map((r) => r.currency).filter((c): c is string => Boolean(c))),
  ];
  return { total, paid, currencies, items: (rows ?? []).length };
}
