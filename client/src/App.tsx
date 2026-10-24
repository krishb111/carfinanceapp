import { useEffect, useState } from "react";
import { api, type Health } from "./api";
import CashFlowPanel from "./components/CashFlowPanel";
import PricesPanel from "./components/PricesPanel";
import "./styles.css";

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <main>
      <header>
        <h1>Smart Next Move</h1>
        <p className="muted">Your Toyota lease is ending. Find the smartest next move.</p>
        <div className="status">
          {health
            ? Object.entries(health.services).map(([name, ok]) => (
                <span key={name} className={`pill ${ok ? "ok" : "bad"}`}>{name}</span>
              ))
            : <span className="pill bad">API offline</span>}
        </div>
      </header>
      <CashFlowPanel />
      <PricesPanel />
    </main>
  );
}
