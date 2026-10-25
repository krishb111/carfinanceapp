import { useState } from "react";
import { api, usd, type Dealer, type PricePoint, type Quote } from "../api";
import PriceChart from "./PriceChart";
import DealerList from "./DealerList";
import { TOYOTA_MODELS } from "../models";

const LABELS: Record<Quote["kind"], string> = { used: "Your car (used market)", trade_in: "Trade-in estimate", new: "New replacement" };

export default function PricesPanel() {
  const [model, setModel] = useState("RAV4");
  const [year, setYear] = useState(2023);
  const [city, setCity] = useState("Dallas TX");
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [dealers, setDealers] = useState<Dealer[] | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    setLoading(true);
    setError(null);
    try {
      const [q, d, h] = await Promise.all([api.quotes(model, year, city), api.dealers(model, city), api.history(model, "used")]);
      setQuotes(q.quotes);
      setDealers(d);
      setHistory(h);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card" id="prices">
      <div className="eyebrow">Step 2</div>
      <h2>What your Toyota is worth today</h2>
      <p className="muted">Live listings from Google via SerpApi, tracked over time in Tiger Data.</p>
      <div className="row">
        <select value={model} onChange={(e) => setModel(e.target.value)}>
          {TOYOTA_MODELS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 90 }} />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City, State" />
        <button onClick={search} disabled={loading}>{loading ? "Searching…" : "Get prices"}</button>
      </div>
      {error && <p className="error">{error}</p>}
      {quotes && (
        <div className="stats">
          {quotes.map((q) => (
            <div key={q.kind} className="stat">
              <div className="muted">{LABELS[q.kind]}</div>
              <div className="stat-value">{usd(q.price)}</div>
              <div className="muted small">{q.cached ? "cached (24h)" : q.samples ? `${q.samples} listings` : "estimated"}</div>
            </div>
          ))}
          {quotes.length === 0 && <p className="muted">No prices found for that search.</p>}
        </div>
      )}
      {history.length > 1 && (
        <>
          <h3>Used {model} price history</h3>
          <PriceChart points={history} />
        </>
      )}
      {dealers && dealers.length > 0 && (
        <div id="dealers">
          <h3>Toyota dealers near {city}</h3>
          <DealerList dealers={dealers} model={model} />
        </div>
      )}
    </section>
  );
}
