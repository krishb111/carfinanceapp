async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`);
  return data as T;
}

export type Health = { status: string; services: Record<string, boolean> };
export type CashFlow = {
  totalBalance: number;
  savingsBalance: number;
  monthlyIncome: number;
  monthlySpending: number;
  freeCashFlow: number;
  spendingByCategory: Record<string, number>;
  monthsAnalyzed: number;
};
export type Quote = { kind: "new" | "used" | "trade_in"; price: number; samples: number; source: string; cached: boolean };
export type Dealer = { name?: string; address?: string; rating?: number; phone?: string };
export type PricePoint = { week: string; price: number };

export const api = {
  health: () => request<Health>("/health"),
  createDemoCustomer: () => request<{ customerId: string }>("/nessie/demo-customer", { method: "POST" }),
  cashFlow: (id: string) => request<CashFlow>(`/nessie/customers/${id}/cashflow`),
  quotes: (model: string, year: number, city: string) =>
    request<{ quotes: Quote[] }>(`/prices/${model}?year=${year}&city=${encodeURIComponent(city)}`),
  dealers: (model: string, city: string) => request<Dealer[]>(`/prices/${model}/dealers?city=${encodeURIComponent(city)}`),
  history: (model: string, kind: string) => request<PricePoint[]>(`/prices/${model}/history?kind=${kind}`),
};

export const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export type LifeEvent = "none" | "new_baby" | "relocation" | "income_drop" | "remote_work" | "longer_commute";
export type LeaseInput = {
  model: string;
  year: number;
  monthlyPayment: number;
  buyoutPrice: number;
  milesDriven: number;
  mileageAllowance: number;
  annualMiles: number;
  lifeEvent: LifeEvent;
};
export type Option = {
  id: string;
  title: string;
  monthlyPayment: number;
  upfront: number;
  netCost: number;
  affordability: number;
  score: number;
  reasons: string[];
};
export type Recommendation = {
  horizonMonths: number;
  equity: number;
  freeCashFlow: number;
  market: { used: number; tradeIn: number; newPrice: number };
  options: Option[];
  assumptions: Record<string, string | number>;
};

export const recommend = (customerId: string, city: string, lease: LeaseInput) =>
  request<Recommendation>("/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId, city, lease }),
  });
