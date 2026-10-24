import { useEffect, useRef, useState } from "react";
import { chat, explain, type ChatMessage, type Recommendation } from "../api";

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
    const next: ChatMessage[] = [...messages, { role: "user", text: question.trim() }];
    setMessages(next);
    setInput("");
    setThinking(true);
    setError(null);
    try {
      const { text } = await chat(analysis, next);
      setMessages([...next, { role: "model", text }]);
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
          <div key={i} className={`bubble ${m.role}`}><Formatted text={m.text} /></div>
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
