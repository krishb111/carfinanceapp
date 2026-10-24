import { useState } from "react";
import { recommend, usd, type LeaseInput, type LifeEvent, type Recommendation } from "../api";

const LIFE_EVENTS: { id: LifeEvent; label: string }[] = [
  { id: "none", label: "No big changes" },
  { id: "new_baby", label: "New baby / growing family" },
  { id: "relocation", label: "Moving to a new city" },
  { id: "income_drop", label: "Income went down" },
  { id: "remote_work", label: "Working remotely / driving less" },
  { id: "longer_commute", label: "Longer commute" },
];

const FIELDS: { key: keyof LeaseInput; label: string }[] = [
  { key: "year", label: "Year" },
  { key: "monthlyPayment", label: "Monthly payment ($)" },
  { key: "buyoutPrice", label: "Lease buyout ($)" },
  { key: "milesDriven", label: "Miles on car" },
  { key: "mileageAllowance", label: "Lease mile allowance" },
  { key: "annualMiles", label: "Miles you drive / yr" },
];

export default function RecommendationPanel() {
  const [lease, setLease] = useState<LeaseInput>({
    model: "RAV4", year: 2023, monthlyPayment: 389, buyoutPrice: 26450,
    milesDriven: 31200, mileageAllowance: 36000, annualMiles: 12000, lifeEvent: "none",
  });
  const [city, setCity] = useState("Dallas TX");
  const [result, setResult] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof LeaseInput>(key: K, value: LeaseInput[K]) => setLease((l) => ({ ...l, [key]: value }));

  async function submit() {
    const customerId = localStorage.getItem("nessieCustomerId");
    if (!customerId) return setError("Create a demo customer in the Bank cash flow section first.");
    setLoading(true);
    setError(null);
    try {
      setResult(await recommend(customerId, city, lease));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const [best, ...rest] = result?.options ?? [];

  return (
    <section className="card">
      <h2>Your smartest next move <span className="tag">Toyota</span></h2>
      <div className="form-grid">
        <label>Model<input value={lease.model} onChange={(e) => set("model", e.target.value)} /></label>
        {FIELDS.map((f) => (
          <label key={f.key}>
            {f.label}
            <input type="number" value={lease[f.key] as number} onChange={(e) => set(f.key, Number(e.target.value) as never)} />
          </label>
        ))}
        <label>City<input value={city} onChange={(e) => setCity(e.target.value)} /></label>
        <label className="span-2">
          Life event
          <select value={lease.lifeEvent} onChange={(e) => set("lifeEvent", e.target.value as LifeEvent)}>
            {LIFE_EVENTS.map((ev) => <option key={ev.id} value={ev.id}>{ev.label}</option>)}
          </select>
        </label>
      </div>
      <button onClick={submit} disabled={loading} style={{ marginTop: 12 }}>
        {loading ? "Crunching numbers…" : "Find my next move"}
      </button>
      {error && <p className="error">{error}</p>}

      {result && best && (
        <>
          <div className="stats">
            <Mini label="Your equity" value={usd(result.equity)} good={result.equity > 0} />
            <Mini label="Market value" value={usd(result.market.used)} />
            <Mini label="New price" value={usd(result.market.newPrice)} />
            <Mini label="Free cash flow" value={`${usd(result.freeCashFlow)}/mo`} />
          </div>
          <OptionCard option={best} horizon={result.horizonMonths} top />
          {rest.map((o) => <OptionCard key={o.id} option={o} horizon={result.horizonMonths} />)}
          <details className="muted small" style={{ marginTop: 12 }}>
            <summary>Assumptions</summary>
            <ul>{Object.entries(result.assumptions).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
          </details>
        </>
      )}
    </section>
  );
}

function Mini({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="stat">
      <div className="muted small">{label}</div>
      <div className="stat-value" style={good ? { color: "var(--ok)" } : undefined}>{value}</div>
    </div>
  );
}

function OptionCard({ option, horizon, top }: { option: Recommendation["options"][number]; horizon: number; top?: boolean }) {
  return (
    <div className={`option ${top ? "top" : ""}`}>
      <div className="option-head">
        <div>
          {top && <div className="badge">Recommended</div>}
          <strong>{option.title}</strong>
        </div>
        <div className="score">{option.score}<span className="muted small">/100</span></div>
      </div>
      <div className="option-nums muted small">
        <span><strong>{usd(option.monthlyPayment)}</strong>/mo</span>
        {option.upfront > 0 && <span>{usd(option.upfront)} upfront</span>}
        <span>{horizon}-mo net cost <strong>{usd(option.netCost)}</strong></span>
        <span>{Math.round(option.affordability * 100)}% of budget</span>
      </div>
      <ul className="reasons">{option.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
    </div>
  );
}
