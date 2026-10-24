import { useState } from "react";
import { api, usd, type CashFlow } from "../api";

const STORAGE_KEY = "nessieCustomerId";

export default function CashFlowPanel() {
  const [customerId, setCustomerId] = useState(() => localStorage.getItem(STORAGE_KEY) ?? "");
  const [cashFlow, setCashFlow] = useState<CashFlow | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(label: string, fn: () => Promise<void>) {
    setLoading(label);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  const createCustomer = () =>
    run("Creating demo customer (about 30s)…", async () => {
      const { customerId } = await api.createDemoCustomer();
      localStorage.setItem(STORAGE_KEY, customerId);
      setCustomerId(customerId);
      setCashFlow(await api.cashFlow(customerId));
    });

  const loadCashFlow = () => run("Loading cash flow…", async () => setCashFlow(await api.cashFlow(customerId)));

  const categories = cashFlow ? Object.entries(cashFlow.spendingByCategory).sort((a, b) => b[1] - a[1]) : [];
  const maxCategory = categories[0]?.[1] ?? 1;

  return (
    <section className="card">
      <h2>Bank cash flow <span className="tag">Capital One Nessie</span></h2>
      <div className="row">
        <button onClick={createCustomer} disabled={Boolean(loading)}>Create demo customer</button>
        <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="Nessie customer ID" />
        <button className="secondary" onClick={loadCashFlow} disabled={!customerId || Boolean(loading)}>Load</button>
      </div>
      {loading && <p className="muted">{loading}</p>}
      {error && <p className="error">{error}</p>}
      {cashFlow && (
        <>
          <div className="stats">
            <Stat label="Monthly income" value={usd(cashFlow.monthlyIncome)} />
            <Stat label="Monthly spending" value={usd(cashFlow.monthlySpending)} />
            <Stat label="Free cash flow" value={usd(cashFlow.freeCashFlow)} highlight />
            <Stat label="Total balance" value={usd(cashFlow.totalBalance)} />
          </div>
          <h3>Spending by category (monthly avg)</h3>
          {categories.map(([name, amount]) => (
            <div key={name} className="bar-row">
              <span>{name}</span>
              <div className="bar"><div style={{ width: `${(amount / maxCategory) * 100}%` }} /></div>
              <span>{usd(amount)}</span>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`stat ${highlight ? "highlight" : ""}`}>
      <div className="muted">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
