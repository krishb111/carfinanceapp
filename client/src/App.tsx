import { useEffect, useState } from "react";

type Health = { status: string; services: Record<string, boolean> };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 640, margin: "48px auto", padding: "0 16px" }}>
      <h1>Smart Next Move</h1>
      <p>Your lease is ending. Find the smartest next move for your Toyota.</p>
      <h2>Service status</h2>
      {health ? (
        <ul>
          {Object.entries(health.services).map(([name, ok]) => (
            <li key={name}>{ok ? "✅" : "❌"} {name}</li>
          ))}
        </ul>
      ) : (
        <p>API not reachable.</p>
      )}
    </main>
  );
}
