import { useEffect, useState } from "react";
import { api, type Health } from "./api";
import CashFlowPanel from "./components/CashFlowPanel";
import PricesPanel from "./components/PricesPanel";
import RecommendationPanel from "./components/RecommendationPanel";
import "./styles.css";

const NAV = [
  { href: "#finances", label: "Your Finances" },
  { href: "#prices", label: "Vehicle Value" },
  { href: "#next-move", label: "Next Move" },
  { href: "#dealers", label: "Dealers" },
];

const SERVICE_LABELS: Record<string, string> = {
  nessie: "Capital One Nessie",
  serpapi: "SerpApi",
  gemini: "Gemini",
  database: "Tiger Data",
};

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <>
      <nav className="topnav">
        <div className="topnav-inner">
          <a href="#" className="brand">
            <span className="brand-mark" aria-hidden="true" />
            Smart Next Move
          </a>
          <div className="nav-links">
            {NAV.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
          </div>
          <a href="#next-move" className="btn nav-cta">Get started</a>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-inner">
          <div className="eyebrow light">Lease ending soon?</div>
          <h1>Find your smartest<br />next move.</h1>
          <p>
            Buy out, trade in, re-lease, or go flexible. We compare every option using your real cash flow
            and today's market prices, then explain it in plain English.
          </p>
          <div className="hero-actions">
            <a href="#finances" className="btn light">Start with your finances</a>
            <a href="#next-move" className="btn ghost">See my options</a>
          </div>
        </div>
      </header>

      <div className="status-bar">
        <div className="status-inner">
          <span className="muted small">Live data:</span>
          {health
            ? Object.entries(health.services).map(([name, ok]) => (
                <span key={name} className={`pill ${ok ? "ok" : "bad"}`}>{SERVICE_LABELS[name] ?? name}</span>
              ))
            : <span className="pill bad">API offline</span>}
        </div>
      </div>

      <main>
        <CashFlowPanel />
        <PricesPanel />
        <RecommendationPanel />
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <strong>Smart Next Move</strong>
          <p className="small">
            An independent hackathon project. Not affiliated with or endorsed by Toyota Motor Corporation.
            Estimates only, not financial advice. Confirm all numbers with your dealer.
          </p>
        </div>
      </footer>
    </>
  );
}
