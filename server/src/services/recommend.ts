import type { CashFlow } from "./cashflow.js";

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
  /** Cash put down on a purchase or new lease (optional) */
  downPayment?: number;
};

export type MarketPrices = { used: number; tradeIn: number; newPrice: number };

export type OptionId = "buy_out" | "trade_in" | "re_lease" | "extend" | "go_flexible";

export type Option = {
  id: OptionId;
  title: string;
  monthlyPayment: number;
  upfront: number;
  /** Total out-of-pocket over the horizon minus what the car is worth to you at the end */
  netCost: number;
  /** Monthly vehicle cost as a share of current free cash flow */
  affordability: number;
  score: number;
  reasons: string[];
};

export type Recommendation = {
  horizonMonths: number;
  equity: number;
  freeCashFlow: number;
  options: Option[];
  assumptions: Assumptions;
};

const HORIZON = 36;
const MAINT_OWNED_OLDER = 90;
const MAINT_NEW = 35;
const FLEX_INSURANCE_SAVED = 120; // subscription bundles insurance

/** Market and financing assumptions; users can override any of these from the UI. */
export type Assumptions = {
  loanApr: number; // percent
  loanTermMonths: number;
  leaseFactor: number; // monthly lease payment as % of MSRP
  leaseDueAtSigning: number;
  valueRetained3yr: number; // percent of value a Toyota keeps after ~3 years
  overMileFee: number; // dollars per mile
  tradeInRatio: number; // percent of retail value a dealer pays on trade-in
  subscriptionPrice: number; // all-in monthly subscription incl. maintenance
  perMileRate: number; // usage-based rate for low-mileage drivers
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

/** Fills in defaults and drops anything that isn't a sane number. */
export function resolveAssumptions(overrides?: Partial<Assumptions>): Assumptions {
  const a = { ...DEFAULT_ASSUMPTIONS };
  for (const key of Object.keys(a) as (keyof Assumptions)[]) {
    const v = Number(overrides?.[key]);
    if (overrides?.[key] !== undefined && Number.isFinite(v) && v >= 0) a[key] = v;
  }
  a.loanTermMonths = Math.max(12, Math.round(a.loanTermMonths));
  return a;
}

const round = (x: number) => Math.round(x);

/** Standard amortized loan payment. */
export function loanPayment(principal: number, apr: number, months: number) {
  if (principal <= 0) return 0;
  const r = apr / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - (1 + r) ** -months);
}

/** Loan balance remaining after `paid` payments. */
function loanBalance(principal: number, paid: number, apr: number, months: number) {
  if (principal <= 0) return 0;
  const r = apr / 12;
  if (r === 0) return Math.max(0, principal - (principal / months) * paid);
  const pmt = loanPayment(principal, apr, months);
  return principal * (1 + r) ** paid - (pmt * ((1 + r) ** paid - 1)) / r;
}

const LIFE_EVENT_FIT: Record<LifeEvent, Partial<Record<OptionId, { boost: number; reason: string }>>> = {
  none: {},
  new_baby: {
    trade_in: { boost: 0.15, reason: "Your equity can move you into a bigger, newer car with the latest safety tech for the baby." },
    re_lease: { boost: 0.1, reason: "A new lease gets you a family-sized model with full warranty." },
  },
  relocation: {
    go_flexible: { boost: 0.2, reason: "A subscription has no long-term commitment while you settle into a new city." },
    extend: { boost: 0.1, reason: "Extending buys time until you know your new commute." },
  },
  income_drop: {
    buy_out: { boost: 0.1, reason: "Owning outright lets you lower costs over time instead of resetting a payment." },
    extend: { boost: 0.1, reason: "Extending avoids new fees and down payments while income is lower." },
  },
  remote_work: {
    go_flexible: { boost: 0.2, reason: "You're driving less, so usage-based pricing means you pay only for the miles you drive." },
  },
  longer_commute: {
    buy_out: { boost: 0.15, reason: "Owning means no mileage limits for your longer commute." },
    trade_in: { boost: 0.05, reason: "A newer car adds reliability for heavy daily driving." },
  },
};

export function recommend(
  lease: LeaseInput,
  market: MarketPrices,
  cashFlow: CashFlow,
  overrides?: Partial<Assumptions>
): Recommendation {
  const a = resolveAssumptions(overrides);
  const apr = a.loanApr / 100;
  const loan = (principal: number) => loanPayment(principal, apr, a.loanTermMonths);
  const balanceAfter = (principal: number, paid: number) => loanBalance(principal, paid, apr, a.loanTermMonths);
  const LEASE_FACTOR = a.leaseFactor / 100;
  const LEASE_DUE_AT_SIGNING = a.leaseDueAtSigning;
  const DEPRECIATION_3YR = a.valueRetained3yr / 100;
  const OVER_MILE_FEE = a.overMileFee;
  const FLEX_BASE = a.subscriptionPrice;
  const FLEX_PER_MILE = a.perMileRate;

  const equity = round(market.tradeIn - lease.buyoutPrice);
  const overMiles = Math.max(0, lease.milesDriven - lease.mileageAllowance);
  const turnInFee = round(overMiles * OVER_MILE_FEE);
  const futureLeaseMiles = (lease.annualMiles * HORIZON) / 12;
  const futureOverMileFee = Math.max(0, futureLeaseMiles - 36000) * OVER_MILE_FEE;
  const fcf = cashFlow.freeCashFlow;
  // Free cash flow already has the current lease payment taken out, so add it back
  const budget = fcf + lease.monthlyPayment;

  const down = Math.max(0, lease.downPayment ?? 0);

  const options: Omit<Option, "score" | "affordability">[] = [];

  // 1. Buy out the lease (financed)
  {
    const financed = Math.max(0, lease.buyoutPrice - down);
    const pmt = loan(financed);
    const balance = balanceAfter(financed, HORIZON);
    const valueLater = market.used * DEPRECIATION_3YR;
    const outOfPocket = down + pmt * HORIZON + MAINT_OWNED_OLDER * HORIZON;
    const reasons = [
      equity > 0
        ? `Your buyout is ${usd(lease.buyoutPrice)}, but dealers would pay ${usd(market.tradeIn)} for it (${usd(market.used)} retail), so you keep ${usd(equity)} of equity.`
        : `Your buyout (${usd(lease.buyoutPrice)}) is above trade-in value (${usd(market.tradeIn)}), so you'd overpay by ${usd(-equity)}.`,
    ];
    if (overMiles > 0) reasons.push(`Avoids ${usd(turnInFee)} in over-mileage fees.`);
    options.push({
      id: "buy_out", title: "Buy out your lease", monthlyPayment: round(pmt), upfront: down,
      netCost: round(outOfPocket - (valueLater - balance) - (overMiles > 0 ? turnInFee : 0)), reasons,
    });
  }

  // 2. Trade in equity toward a new purchase
  {
    const principal = Math.max(0, market.newPrice - equity - down);
    const pmt = loan(principal);
    const balance = balanceAfter(principal, HORIZON);
    const valueLater = market.newPrice * DEPRECIATION_3YR;
    const outOfPocket = down + pmt * HORIZON + MAINT_NEW * HORIZON;
    const reasons = [
      equity > 0
        ? `Your ${usd(equity)} of lease equity goes toward a new ${lease.model} at ${usd(market.newPrice)}.`
        : `Negative equity of ${usd(-equity)} would be rolled into the new loan.`,
      `You'd own a car worth about ${usd(valueLater)} in 3 years.`,
    ];
    options.push({
      id: "trade_in", title: `Trade in for a new ${lease.model}`, monthlyPayment: round(pmt), upfront: down,
      netCost: round(outOfPocket - (valueLater - balance)), reasons,
    });
  }

  // 3. Re-lease a new model
  {
    // Cash down on a lease lowers the payment roughly evenly across the term
    const pmt = market.newPrice * LEASE_FACTOR - down / HORIZON;
    const reasons = [`Lowest commitment for a new car: about ${usd(pmt)}/mo plus ${usd(LEASE_DUE_AT_SIGNING)} at signing.`];
    if (equity > 0) reasons.push(`You'd walk away from ${usd(equity)} of equity unless you sell the car first.`);
    if (turnInFee > 0) reasons.push(`You'd pay ${usd(turnInFee)} in over-mileage fees at turn-in.`);
    if (futureOverMileFee > 0) reasons.push(`At ${lease.annualMiles.toLocaleString()} mi/yr you'd owe about ${usd(futureOverMileFee)} in mileage fees on the next lease.`);
    options.push({
      id: "re_lease", title: `Lease a new ${lease.model}`, monthlyPayment: round(pmt), upfront: LEASE_DUE_AT_SIGNING + down,
      netCost: round(pmt * HORIZON + LEASE_DUE_AT_SIGNING + down + turnInFee + futureOverMileFee + Math.max(equity, 0) + MAINT_NEW * HORIZON),
      reasons,
    });
  }

  // 4. Extend the current lease, then decide
  {
    const months = 12;
    const reasons = [
      `Keep paying ${usd(lease.monthlyPayment)}/mo for up to ${months} months with no new fees.`,
      "Gives you time to wait for better prices or a life change to settle.",
    ];
    // Extension covers a third of the horizon, then assume a re-lease for the remainder
    const later = market.newPrice * LEASE_FACTOR * (HORIZON - months) + LEASE_DUE_AT_SIGNING;
    options.push({
      id: "extend", title: "Extend your lease", monthlyPayment: round(lease.monthlyPayment), upfront: 0,
      netCost: round(lease.monthlyPayment * months + MAINT_OWNED_OLDER * months + later + Math.max(equity, 0)),
      reasons,
    });
  }

  // 5. Go flexible: subscription or usage-based (Toyota as a mobility company)
  {
    const usageBased = lease.annualMiles < 9000;
    const pmt = usageBased
      ? FLEX_BASE * 0.6 + (lease.annualMiles / 12) * FLEX_PER_MILE
      : FLEX_BASE;
    const reasons = [
      usageBased
        ? `You drive ${lease.annualMiles.toLocaleString()} mi/yr, so usage-based pricing (${usd(FLEX_PER_MILE)}/mile) keeps costs low.`
        : "One monthly price covers the car, insurance, and maintenance. Cancel or swap models anytime.",
      `Includes insurance, saving about ${usd(FLEX_INSURANCE_SAVED)}/mo on your current policy.`,
    ];
    if (equity > 0) reasons.push(`Sell your car to the dealer first to capture ${usd(equity)} of equity.`);
    options.push({
      id: "go_flexible", title: usageBased ? "Go flexible: pay per mile" : "Go flexible: Toyota subscription",
      monthlyPayment: round(pmt - FLEX_INSURANCE_SAVED), upfront: 0,
      netCost: round((pmt - FLEX_INSURANCE_SAVED) * HORIZON - Math.max(equity, 0) + turnInFee),
      reasons,
    });
  }

  // Score: cheaper net cost (55%), affordability vs budget (25%), life-event fit (20%)
  const costs = options.map((o) => o.netCost);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const scored = options.map((o) => {
    const affordability = budget > 0 ? o.monthlyPayment / budget : 1;
    const costScore = maxCost === minCost ? 1 : 1 - (o.netCost - minCost) / (maxCost - minCost);
    const affordScore = Math.max(0, 1 - affordability / 0.6);
    const fit = LIFE_EVENT_FIT[lease.lifeEvent][o.id];
    const reasons = fit ? [fit.reason, ...o.reasons] : o.reasons;
    if (affordability > 0.5) reasons.push(`This payment would take ${Math.round(affordability * 100)}% of your free cash flow. That's tight.`);
    const score = 0.55 * costScore + 0.25 * affordScore + (fit?.boost ?? 0);
    return { ...o, affordability: Math.round(affordability * 100) / 100, score: Math.round(score * 100), reasons };
  });

  return {
    horizonMonths: HORIZON,
    equity,
    freeCashFlow: fcf,
    options: scored.sort((a, b) => b.score - a.score),
    assumptions: a,
  };
}

function usd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
