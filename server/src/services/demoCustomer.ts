import * as nessie from "./nessie.js";

const MONTHS = 3;

type Range = [number, number];
type Bill = { merchant: string; category: string; amount: Range; day: number; fixed?: boolean };
type Profile = {
  id: string;
  label: string;
  paycheck: Range; // paid twice a month
  checking: Range;
  savings: Range;
  bills: Bill[];
};

const COMMON: Bill[] = [
  { merchant: "Toyota Financial Services", category: "Auto", amount: [389, 389], day: 5, fixed: true },
  { merchant: "Oncor Electric", category: "Utilities", amount: [110, 220], day: 12 },
  { merchant: "Shell", category: "Gas", amount: [120, 260], day: 18 },
];

const PROFILES: Profile[] = [
  {
    id: "tight_budget",
    label: "Tight budget",
    paycheck: [1550, 1850],
    checking: [400, 1500],
    savings: [300, 2000],
    bills: [
      ...COMMON,
      { merchant: "Maple Court Apartments", category: "Housing", amount: [1250, 1500], day: 1, fixed: true },
      { merchant: "Progressive", category: "Insurance", amount: [150, 190], day: 8, fixed: true },
      { merchant: "Aldi", category: "Groceries", amount: [380, 480], day: 14 },
      { merchant: "Taco Bell", category: "Dining", amount: [80, 160], day: 21 },
      { merchant: "Discover Card", category: "Debt", amount: [200, 300], day: 24, fixed: true },
    ],
  },
  {
    id: "steady_saver",
    label: "Steady saver",
    paycheck: [2300, 2700],
    checking: [3000, 6000],
    savings: [6000, 14000],
    bills: [
      ...COMMON,
      { merchant: "Lakeview Apartments", category: "Housing", amount: [1500, 1750], day: 1, fixed: true },
      { merchant: "State Farm", category: "Insurance", amount: [130, 155], day: 8, fixed: true },
      { merchant: "Kroger", category: "Groceries", amount: [450, 600], day: 14 },
      { merchant: "Chipotle", category: "Dining", amount: [180, 320], day: 21 },
      { merchant: "Netflix", category: "Subscriptions", amount: [30, 60], day: 25 },
    ],
  },
  {
    id: "comfortable",
    label: "Comfortable earner",
    paycheck: [3800, 4800],
    checking: [8000, 15000],
    savings: [25000, 45000],
    bills: [
      ...COMMON,
      { merchant: "Uptown Lofts", category: "Housing", amount: [2100, 2600], day: 1, fixed: true },
      { merchant: "USAA", category: "Insurance", amount: [120, 140], day: 8, fixed: true },
      { merchant: "Whole Foods", category: "Groceries", amount: [650, 900], day: 14 },
      { merchant: "Uchi", category: "Dining", amount: [400, 700], day: 21 },
      { merchant: "Equinox", category: "Fitness", amount: [200, 250], day: 3, fixed: true },
      { merchant: "Delta Air Lines", category: "Travel", amount: [150, 600], day: 26 },
    ],
  },
  {
    id: "growing_family",
    label: "Growing family",
    paycheck: [2800, 3300],
    checking: [1500, 4000],
    savings: [3000, 9000],
    bills: [
      ...COMMON,
      { merchant: "Oak Hollow Homes", category: "Housing", amount: [1750, 2050], day: 1, fixed: true },
      { merchant: "State Farm", category: "Insurance", amount: [170, 210], day: 8, fixed: true },
      { merchant: "Bright Horizons", category: "Childcare", amount: [950, 1300], day: 2, fixed: true },
      { merchant: "H-E-B", category: "Groceries", amount: [700, 950], day: 14 },
      { merchant: "Target", category: "Shopping", amount: [150, 350], day: 20 },
    ],
  },
];

const FIRST = ["Jordan", "Maya", "Diego", "Priya", "Marcus", "Aisha", "Ethan", "Sofia", "Kenji", "Leah"];
const LAST = ["Rivera", "Chen", "Patel", "Johnson", "Nguyen", "Garcia", "Okafor", "Kim", "Brooks", "Silva"];

const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const between = ([lo, hi]: Range) => Math.round(lo + Math.random() * (hi - lo));

const isoDate = (monthsAgo: number, day: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo, day);
  return d.toISOString().slice(0, 10);
};

/** Creates a synthetic Nessie customer from a random profile with 3 months of varied history. */
export async function createDemoCustomer() {
  const profile = pick(PROFILES);
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  const [first, last] = name.split(" ");

  const customer = await nessie.createCustomer(first, last);
  const checking = await nessie.createAccount(customer._id, "Checking", "Everyday Checking", between(profile.checking));
  await nessie.createAccount(customer._id, "Savings", "Car Fund", between(profile.savings));

  const merchants = await Promise.all(profile.bills.map((b) => nessie.createMerchant(b.merchant, b.category)));
  // Fixed bills keep the same amount every month; variable ones change month to month
  const fixedAmounts = profile.bills.map((b) => between(b.amount));
  const salary = between(profile.paycheck);

  for (let m = MONTHS; m >= 1; m--) {
    await nessie.createDeposit(checking._id, salary, isoDate(m, 1), "Payroll");
    await nessie.createDeposit(checking._id, salary, isoDate(m, 15), "Payroll");
    for (const [i, bill] of profile.bills.entries()) {
      const amount = bill.fixed ? fixedAmounts[i] : between(bill.amount);
      await nessie.createPurchase(checking._id, merchants[i]._id, amount, isoDate(m, bill.day), bill.merchant);
    }
  }
  return { customerId: customer._id, name, profile: profile.label };
}
