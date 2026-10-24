import { usd, type PricePoint } from "../api";

const W = 600;
const H = 180;
const PAD = 40;

export default function PriceChart({ points }: { points: PricePoint[] }) {
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (p: number) => H - PAD / 2 - ((p - min) / span) * (H - PAD);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.price)}`).join(" ");
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", year: "2-digit" });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Price history">
      <text x={PAD} y={12} className="axis">{usd(max)}</text>
      <text x={PAD} y={H - 2} className="axis">{usd(min)}</text>
      <path d={path} className="line" />
      {points.map((p, i) => (
        <circle key={p.week} cx={x(i)} cy={y(p.price)} r={3} className="dot">
          <title>{`${fmtDate(p.week)}: ${usd(p.price)}`}</title>
        </circle>
      ))}
      <text x={W - PAD} y={H - 2} textAnchor="end" className="axis">{fmtDate(points[points.length - 1].week)}</text>
    </svg>
  );
}
