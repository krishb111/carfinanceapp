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
export type Dealer = {
  name?: string;
  address?: string;
  rating?: number;
  reviews?: number;
  phone?: string;
  hours?: string;
  quote?: string;
  website?: string;
  directionsUrl: string;
  inventoryUrl: string;
};
export type PricePoint = { week: string; price: number };

export const api = {
  health: () => request<Health>("/health"),
  createDemoCustomer: () => request<{ customerId: string; name: string; profile: string }>("/nessie/demo-customer", { method: "POST" }),
  cashFlow: (id: string) => request<CashFlow>(`/nessie/customers/${id}/cashflow`),
  quotes: (model: string, year: number, city: string) =>
    request<{ quotes: Quote[] }>(`/prices/${encodeURIComponent(model)}?year=${year}&city=${encodeURIComponent(city)}`),
  dealers: (model: string, city: string) => request<Dealer[]>(`/prices/${encodeURIComponent(model)}/dealers?city=${encodeURIComponent(city)}`),
  history: (model: string, kind: string) => request<PricePoint[]>(`/prices/${encodeURIComponent(model)}/history?kind=${kind}`),
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
  downPayment?: number;
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
  lease: LeaseInput;
  cashFlow: CashFlow;
  options: Option[];
  assumptions: Assumptions;
};

export type Assumptions = {
  loanApr: number;
  loanTermMonths: number;
  leaseFactor: number;
  leaseDueAtSigning: number;
  valueRetained3yr: number;
  overMileFee: number;
  tradeInRatio: number;
  subscriptionPrice: number;
  perMileRate: number;
};

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  loanApr: 6.9,
  loanTermMonths: 60,
  leaseFactor: 1.55,
  leaseDueAtSigning: 2000,
  valueRetained3yr: 62,
  overMileFee: 0.25,
  tradeInRatio: 88,
  subscriptionPrice: 649,
  perMileRate: 0.12,
};

export const recommend = (customerId: string, city: string, lease: LeaseInput, assumptions: Assumptions) =>
  request<Recommendation>("/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId, city, lease, assumptions }),
  });

export type ChatMessage = { role: "user" | "model"; text: string };

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const explain = (analysis: Recommendation) => post<{ text: string }>("/explain", { analysis });
export type Scenario = { changes: Record<string, unknown>; result: Pick<Recommendation, "equity" | "freeCashFlow" | "options"> };

export const chat = (analysis: Recommendation, messages: ChatMessage[]) =>
  post<{ text: string; scenario?: Scenario }>("/explain/chat", {
    analysis,
    messages: messages.map(({ role, text }) => ({ role, text })),
  });
