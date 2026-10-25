import { DEFAULT_ASSUMPTIONS, type Assumptions } from "../api";

const FIELDS: { key: keyof Assumptions; label: string; unit: string; step: number; hint: string }[] = [
  { key: "loanApr", label: "Loan APR", unit: "%", step: 0.1, hint: "Interest rate on a buyout or purchase loan" },
  { key: "loanTermMonths", label: "Loan term", unit: "months", step: 12, hint: "How long you'd finance" },
  { key: "leaseFactor", label: "Lease payment", unit: "% of MSRP / mo", step: 0.05, hint: "Typical new lease ≈ 1.3–1.8%" },
  { key: "leaseDueAtSigning", label: "Due at lease signing", unit: "$", step: 250, hint: "Fees and first payment" },
  { key: "valueRetained3yr", label: "Value kept after 3 yrs", unit: "%", step: 1, hint: "Toyotas often keep 55–70%" },
  { key: "tradeInRatio", label: "Trade-in offer", unit: "% of retail", step: 1, hint: "What a dealer pays vs. listing price" },
  { key: "overMileFee", label: "Over-mileage fee", unit: "$ / mile", step: 0.05, hint: "Charged at lease turn-in" },
  { key: "subscriptionPrice", label: "Subscription price", unit: "$ / mo", step: 25, hint: "All-in, incl. maintenance" },
  { key: "perMileRate", label: "Pay-per-mile rate", unit: "$ / mile", step: 0.01, hint: "For drivers under 9,000 mi/yr" },
];

export default function AssumptionsEditor({ value, onChange }: { value: Assumptions; onChange: (a: Assumptions) => void }) {
  const changed = FIELDS.filter((f) => value[f.key] !== DEFAULT_ASSUMPTIONS[f.key]).length;
  return (
    <details className="assumptions">
      <summary>
        Adjust assumptions {changed > 0 && <span className="badge">{changed} changed</span>}
      </summary>
      <div className="form-grid">
        {FIELDS.map((f) => (
          <label key={f.key} title={f.hint}>
            <span>{f.label} <span className="unit">({f.unit})</span></span>
            <input
              type="number"
              min={0}
              step={f.step}
              value={value[f.key]}
              onChange={(e) => onChange({ ...value, [f.key]: Number(e.target.value) })}
            />
            <span className="hint">{f.hint}</span>
          </label>
        ))}
      </div>
      {changed > 0 && (
        <button type="button" className="secondary" onClick={() => onChange(DEFAULT_ASSUMPTIONS)}>Reset to defaults</button>
      )}
    </details>
  );
}
