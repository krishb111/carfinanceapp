import * as nessie from "./nessie.js";

const MONTHS = 3;

// Monthly spending pattern for a mid-income Toyota lessee
const SPENDING = [
  { merchant: "Lakeview Apartments", category: "Housing", amount: 1650, day: 1 },
  { merchant: "Toyota Financial Services", category: "Auto", amount: 389, day: 5 },
  { merchant: "State Farm", category: "Insurance", amount: 142, day: 8 },
  { merchant: "Oncor Electric", category: "Utilities", amount: 165, day: 12 },
  { merchant: "Kroger", category: "Groceries", amount: 520, day: 14 },
  { merchant: "Shell", category: "Gas", amount: 180, day: 18 },
  { merchant: "Chipotle", category: "Dining", amount: 260, day: 21 },
  { merchant: "Netflix", category: "Subscriptions", amount: 45, day: 25 },
];

const isoDate = (monthsAgo: number, day: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo, day);
  return d.toISOString().slice(0, 10);
};

/** Creates a synthetic Nessie customer with checking + savings and 3 months of history. */
export async function createDemoCustomer() {
  const customer = await nessie.createCustomer("Jordan", "Rivera");
  const checking = await nessie.createAccount(customer._id, "Checking", "Everyday Checking", 4200);
  await nessie.createAccount(customer._id, "Savings", "Car Fund", 8500);

  const merchants = await Promise.all(SPENDING.map((s) => nessie.createMerchant(s.merchant, s.category)));

  for (let m = MONTHS; m >= 1; m--) {
    await nessie.createDeposit(checking._id, 2450, isoDate(m, 1), "Payroll - Acme Corp");
    await nessie.createDeposit(checking._id, 2450, isoDate(m, 15), "Payroll - Acme Corp");
    for (const [i, s] of SPENDING.entries()) {
      await nessie.createPurchase(checking._id, merchants[i]._id, s.amount, isoDate(m, s.day), s.merchant);
    }
  }
  return { customerId: customer._id };
}
