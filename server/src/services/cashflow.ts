import * as nessie from "./nessie.js";

export type CashFlow = {
  totalBalance: number;
  savingsBalance: number;
  monthlyIncome: number;
  monthlySpending: number;
  freeCashFlow: number;
  spendingByCategory: Record<string, number>;
  monthsAnalyzed: number;
};

const monthKey = (date: string) => date.slice(0, 7);

/** Summarizes a Nessie customer's balances and average monthly cash flow. */
export async function getCashFlow(customerId: string): Promise<CashFlow> {
  const accounts = await nessie.getAccounts(customerId);
  const months = new Set<string>();
  const byCategory: Record<string, number> = {};
  const merchantCache = new Map<string, string>();
  let income = 0;
  let spending = 0;

  for (const account of accounts) {
    const [deposits, purchases] = await Promise.all([nessie.getDeposits(account._id), nessie.getPurchases(account._id)]);
    for (const d of deposits) {
      income += d.amount;
      months.add(monthKey(d.transaction_date));
    }
    for (const p of purchases) {
      if (!merchantCache.has(p.merchant_id)) {
        const merchant = await nessie.getMerchant(p.merchant_id).catch(() => null);
        const category = merchant ? [merchant.category].flat()[0] : undefined;
        merchantCache.set(p.merchant_id, category ?? "Other");
      }
      const category = merchantCache.get(p.merchant_id)!;
      byCategory[category] = (byCategory[category] ?? 0) + p.amount;
      spending += p.amount;
      months.add(monthKey(p.purchase_date));
    }
  }

  const n = Math.max(months.size, 1);
  const round = (x: number) => Math.round(x * 100) / 100;
  const monthlyIncome = round(income / n);
  const monthlySpending = round(spending / n);

  return {
    totalBalance: round(accounts.reduce((sum, a) => sum + a.balance, 0)),
    savingsBalance: round(accounts.filter((a) => a.type === "Savings").reduce((sum, a) => sum + a.balance, 0)),
    monthlyIncome,
    monthlySpending,
    freeCashFlow: round(monthlyIncome - monthlySpending),
    spendingByCategory: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, round(v / n)])),
    monthsAnalyzed: n,
  };
}
