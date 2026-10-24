import { useEffect, useRef, useState } from "react";
import { chat, explain, usd, type ChatMessage, type Recommendation, type Scenario } from "../api";

type Message = ChatMessage & { scenario?: Scenario };

const SUGGESTIONS = [
  "What if I put $3,000 down?",
  "What if I only drive 6,000 miles a year?",
  "Explain equity like I'm 15",
  "Is the subscription worth it?",
];

/** Renders Gemini's light markdown: paragraphs, bullets, and **bold**. */
function Formatted({ text }: { text: string }) {
  const inline = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part
    );
  const blocks = text.split(/\n\s*\n/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter(Boolean);
        if (lines.every((l) => /^\s*[-*•]\s/.test(l))) {
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*•]\s/, ""))}</li>)}</ul>;
        }
        return <p key={i}>{inline(lines.join(" "))}</p>;
      })}
    </>
  );
}

export default function Explainer({ analysis }: { analysis: Recommendation }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSummary(null);
    setMessages([]);
    setError(null);
    explain(analysis).then((r) => setSummary(r.text)).catch((err) => setError(err.message));
  }, [analysis]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, thinking]);

  async function ask(question: string) {
    if (!question.trim() || thinking) return;
    const next: Message[] = [...messages, { role: "user", text: question.trim() }];
    setMessages(next);
    setInput("");
    setThinking(true);
    setError(null);
    try {
      const { text, scenario } = await chat(analysis, next);
      setMessages([...next, { role: "model", text, scenario }]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="explainer">
      <h3>In plain English <span className="tag">Gemini</span></h3>
      {summary ? <div className="summary"><Formatted text={summary} /></div> : !error && <p className="muted">Writing your explanation…</p>}

      <h3>Ask "what if…"</h3>
      <div className="chat">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <Formatted text={m.text} />
            {m.scenario && <ScenarioTable scenario={m.scenario} original={analysis} />}
          </div>
        ))}
        {thinking && <div className="bubble model muted">Thinking…</div>}
        <div ref={endRef} />
      </div>
      {messages.length === 0 && (
        <div className="chips">
          {SUGGESTIONS.map((s) => <button key={s} className="secondary chip" onClick={() => ask(s)}>{s}</button>)}
        </div>
      )}
      <form className="row" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="What if I wait 6 months?" />
        <button disabled={thinking || !input.trim()}>Ask</button>
      </form>
      {error && <p className="error">{error}</p>}
      <p className="muted small">AI explanations are estimates, not financial advice. Confirm numbers with your Toyota dealer.</p>
    </div>
  );
}

const LABELS: Record<string, string> = {
  downPayment: "Down payment",
  monthlyPayment: "Lease payment",
  buyoutPrice: "Buyout",
  milesDriven: "Miles on car",
  mileageAllowance: "Mile allowance",
  annualMiles: "Miles / yr",
  lifeEvent: "Life event",
  monthlyIncomeChange: "Income change / mo",
  newCarPrice: "New car price",
  tradeInValue: "Trade-in value",
};

/** Re-run rankings from the engine, with how each option moved versus the original analysis. */
function ScenarioTable({ scenario, original }: { scenario: Scenario; original: Recommendation }) {
  const before = new Map(original.options.map((o, i) => [o.id, { rank: i + 1, monthly: o.monthlyPayment }]));
  const fmt = (k: string, v: unknown) => (typeof v === "number" && k !== "annualMiles" && k !== "milesDriven" && k !== "mileageAllowance" ? usd(v) : String(v));
  return (
    <div className="scenario">
      <div className="muted small">
        Recalculated with{" "}
        {Object.entries(scenario.changes).map(([k, v]) => `${LABELS[k] ?? k}: ${fmt(k, v)}`).join(", ")}
      </div>
      <table>
        <tbody>
          {scenario.result.options.map((o, i) => {
            const prev = before.get(o.id);
            const moved = prev ? prev.rank - (i + 1) : 0;
            const delta = prev ? o.monthlyPayment - prev.monthly : 0;
            return (
              <tr key={o.id}>
                <td>{i + 1}.</td>
                <td>{o.title} {moved !== 0 && <span className={moved > 0 ? "up" : "down"}>{moved > 0 ? `▲${moved}` : `▼${-moved}`}</span>}</td>
                <td className="num">{usd(o.monthlyPayment)}/mo{delta !== 0 && <span className="muted small"> ({delta > 0 ? "+" : ""}{usd(delta)})</span>}</td>
                <td className="num">{o.score}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
